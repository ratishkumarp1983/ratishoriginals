import { randomUUID } from "node:crypto";
import type { DocStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/adapters/storage";
import { audit } from "@/lib/audit";
import { uniqueDocumentSlug } from "@/lib/slug";
import { docKeys } from "@/lib/documents/keys";
import { processUpload, UploadError } from "@/lib/documents/pipeline";
import type { DocumentCoreInput, MetadataValueInput } from "@/lib/validation/document";

export { UploadError };

interface FilePart {
  name: string;
  bytes: Buffer;
}
interface CoverPart {
  bytes: Buffer;
  ext: string;
}

interface CreateArgs {
  core: DocumentCoreInput;
  metadata: MetadataValueInput[];
  file: FilePart;
  cover?: CoverPart | null;
  actorId: string;
  ip?: string | null;
}

/** Non-empty metadata assignments, de-duplicated by field. */
function cleanMetadata(values: MetadataValueInput[]) {
  const seen = new Map<string, string>();
  for (const v of values) {
    const value = v.value.trim();
    if (value) seen.set(v.metadataId, value);
  }
  return [...seen.entries()].map(([metadataId, value]) => ({ metadataId, value }));
}

export async function createDocument(args: CreateArgs) {
  const id = randomUUID();
  const slug = await uniqueDocumentSlug(args.core.title);

  const processed = await processUpload({
    documentId: id,
    fileName: args.file.name,
    fileBytes: args.file.bytes,
    samplePages: args.core.samplePages,
    cover: args.cover ?? null,
  });

  const meta = cleanMetadata(args.metadata);

  try {
    const doc = await prisma.document.create({
      data: {
        id,
        title: args.core.title,
        slug,
        description: args.core.description,
        price: args.core.price,
        currency: args.core.currency,
        coverImage: processed.coverKey,
        storagePath: processed.originalKey,
        fileType: processed.fileType,
        pageCount: processed.pageCount,
        samplePages: processed.samplePages,
        status: args.core.status,
        seoTitle: args.core.seoTitle || null,
        seoDescription: args.core.seoDescription || null,
        publishedAt: args.core.status === "PUBLISHED" ? new Date() : null,
        metadata: {
          create: meta.map((m) => ({ metadataId: m.metadataId, value: m.value })),
        },
      },
    });

    await audit({
      action: "DOCUMENT_UPLOAD",
      actorId: args.actorId,
      targetType: "Document",
      targetId: id,
      metadata: { title: doc.title, status: doc.status },
      ip: args.ip,
    });
    return doc;
  } catch (err) {
    // Roll back stored assets so a failed create does not orphan files.
    await Promise.all([
      storage().delete(processed.originalKey),
      storage().delete(processed.sampleKey),
      processed.coverKey
        ? storage().delete(processed.coverKey)
        : Promise.resolve(),
    ]);
    throw err;
  }
}

interface UpdateArgs {
  id: string;
  core: DocumentCoreInput;
  metadata: MetadataValueInput[];
  file?: FilePart | null;
  cover?: CoverPart | null;
  actorId: string;
  ip?: string | null;
}

export async function updateDocument(args: UpdateArgs) {
  const existing = await prisma.document.findUnique({ where: { id: args.id } });
  if (!existing) throw new UploadError("Document not found.");

  let storagePath = existing.storagePath;
  let coverImage = existing.coverImage;
  let fileType = existing.fileType;
  let pageCount = existing.pageCount ?? undefined;
  let samplePages = args.core.samplePages;

  // Replace the file and/or cover if new ones were provided.
  if (args.file || args.cover) {
    const processed = await processUpload({
      documentId: args.id,
      fileName: args.file?.name ?? `existing.${existing.fileType}`,
      fileBytes: args.file?.bytes ?? (await storage().get(existing.storagePath)),
      samplePages: args.core.samplePages,
      cover: args.cover ?? null,
    });
    storagePath = processed.originalKey;
    fileType = processed.fileType;
    pageCount = processed.pageCount;
    samplePages = processed.samplePages;
    if (processed.coverKey) {
      // Remove a superseded cover with a different extension.
      if (existing.coverImage && existing.coverImage !== processed.coverKey) {
        await storage().delete(existing.coverImage);
      }
      coverImage = processed.coverKey;
    }
  } else {
    // Sample count may change without a new file: regenerate the sample.
    samplePages = Math.max(1, Math.min(args.core.samplePages, pageCount ?? args.core.samplePages));
  }

  const meta = cleanMetadata(args.metadata);
  const willPublish = args.core.status === "PUBLISHED";

  const doc = await prisma.$transaction(async (tx) => {
    await tx.documentMetadata.deleteMany({ where: { documentId: args.id } });
    return tx.document.update({
      where: { id: args.id },
      data: {
        title: args.core.title,
        description: args.core.description,
        price: args.core.price,
        currency: args.core.currency,
        coverImage,
        storagePath,
        fileType,
        pageCount,
        samplePages,
        status: args.core.status,
        seoTitle: args.core.seoTitle || null,
        seoDescription: args.core.seoDescription || null,
        publishedAt:
          willPublish && !existing.publishedAt
            ? new Date()
            : existing.publishedAt,
        metadata: {
          create: meta.map((m) => ({ metadataId: m.metadataId, value: m.value })),
        },
      },
    });
  });

  await audit({
    action: "DOCUMENT_UPDATE",
    actorId: args.actorId,
    targetType: "Document",
    targetId: args.id,
    metadata: { title: doc.title, status: doc.status },
    ip: args.ip,
  });
  return doc;
}

export async function deleteDocument(id: string, actorId: string, ip?: string | null) {
  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) throw new UploadError("Document not found.");

  await Promise.all([
    storage().delete(docKeys.original(id)),
    storage().delete(docKeys.sample(id)),
    existing.coverImage ? storage().delete(existing.coverImage) : Promise.resolve(),
  ]);

  await prisma.document.delete({ where: { id } });

  await audit({
    action: "DOCUMENT_DELETE",
    actorId,
    targetType: "Document",
    targetId: id,
    metadata: { title: existing.title },
    ip,
  });
}

export type DocumentStatusFilter = DocStatus | "ALL";
