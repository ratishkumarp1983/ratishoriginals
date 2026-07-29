import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { slugify } from "@/lib/slug";
import { getPdfPageCount, makeSamplePdf, looksLikePdf } from "@/lib/documents/pdf";
import { documentCoreSchema } from "@/lib/validation/document";
import { metadataCreateSchema } from "@/lib/validation/metadata";

async function makePdf(pages: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([300, 400]);
  return Buffer.from(await doc.save());
}

describe("slugify", () => {
  it("produces url-safe slugs", () => {
    expect(slugify("The River Wolf!")).toBe("the-river-wolf");
    expect(slugify("  Hello   World  ")).toBe("hello-world");
    expect(slugify("Café Déjà Vu")).toBe("cafe-deja-vu");
  });
  it("never returns empty", () => {
    expect(slugify("!!!")).toBe("document");
  });
});

describe("pdf sample generation", () => {
  it("counts pages and clamps the sample to available pages", async () => {
    const pdf = await makePdf(10);
    expect(looksLikePdf(pdf)).toBe(true);
    expect(await getPdfPageCount(pdf)).toBe(10);

    const { sample, totalPages } = await makeSamplePdf(pdf, 3);
    expect(totalPages).toBe(10);
    expect(await getPdfPageCount(sample)).toBe(3);
  });

  it("caps the sample at the document length", async () => {
    const pdf = await makePdf(2);
    const { sample } = await makeSamplePdf(pdf, 50);
    expect(await getPdfPageCount(sample)).toBe(2);
  });

  it("rejects non-pdf bytes", () => {
    expect(looksLikePdf(Buffer.from("hello world"))).toBe(false);
  });
});

describe("document core validation", () => {
  const base = {
    title: "T",
    description: "D",
    samplePages: 5,
    status: "DRAFT",
  };

  it("requires price (absent is rejected, not coerced to 0)", () => {
    const missing = documentCoreSchema.safeParse({ ...base });
    expect(missing.success).toBe(false);
  });

  it("rejects a non-numeric price but accepts a numeric one", () => {
    expect(documentCoreSchema.safeParse({ ...base, price: "abc" }).success).toBe(
      false,
    );
    const ok = documentCoreSchema.safeParse({ ...base, price: "199.50" });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.price).toBe(199.5);
  });

  it("rejects a negative price", () => {
    expect(documentCoreSchema.safeParse({ ...base, price: "-1" }).success).toBe(
      false,
    );
  });
});

describe("metadata boolean input", () => {
  it("treats the string 'false' as false, not true", () => {
    const r = metadataCreateSchema.safeParse({ name: "X", active: "false" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.active).toBe(false);
  });
});
