import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { slugify } from "@/lib/slug";
import { getPdfPageCount, makeSamplePdf, looksLikePdf } from "@/lib/documents/pdf";

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
