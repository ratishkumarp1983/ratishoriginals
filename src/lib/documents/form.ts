import { documentCoreSchema, metadataValuesSchema } from "@/lib/validation/document";

/**
 * Parse a multipart document form into validated core fields, metadata value
 * assignments, and the (optional) file + cover buffers.
 */
export interface ParsedDocumentForm {
  core: ReturnType<typeof documentCoreSchema.parse>;
  metadata: ReturnType<typeof metadataValuesSchema.parse>;
  file: { name: string; bytes: Buffer } | null;
  cover: { bytes: Buffer; ext: string } | null;
}

export class FormError extends Error {}

function coverExt(name: string, type: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  if (m) return m[1]!.toLowerCase();
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  return "jpg";
}

export async function parseDocumentForm(req: Request): Promise<ParsedDocumentForm> {
  const form = await req.formData();

  const coreResult = documentCoreSchema.safeParse({
    title: form.get("title"),
    description: form.get("description"),
    price: form.get("price"),
    currency: form.get("currency") ?? undefined,
    samplePages: form.get("samplePages") ?? undefined,
    status: form.get("status") ?? undefined,
    seoTitle: form.get("seoTitle") ?? undefined,
    seoDescription: form.get("seoDescription") ?? undefined,
  });
  if (!coreResult.success) {
    throw new FormError(coreResult.error.issues[0]?.message ?? "Invalid input");
  }

  let metadata: ParsedDocumentForm["metadata"] = [];
  const metaRaw = form.get("metadata");
  if (typeof metaRaw === "string" && metaRaw.trim()) {
    let json: unknown;
    try {
      json = JSON.parse(metaRaw);
    } catch {
      throw new FormError("Metadata must be valid JSON.");
    }
    const parsed = metadataValuesSchema.safeParse(json);
    if (!parsed.success) throw new FormError("Invalid metadata values");
    metadata = parsed.data;
  }

  let file: ParsedDocumentForm["file"] = null;
  const f = form.get("file");
  if (f && typeof f !== "string" && f.size > 0) {
    file = { name: f.name, bytes: Buffer.from(await f.arrayBuffer()) };
  }

  let cover: ParsedDocumentForm["cover"] = null;
  const c = form.get("cover");
  if (c && typeof c !== "string" && c.size > 0) {
    cover = {
      bytes: Buffer.from(await c.arrayBuffer()),
      ext: coverExt(c.name, c.type),
    };
  }

  return { core: coreResult.data, metadata, file, cover };
}
