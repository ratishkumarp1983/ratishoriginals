import { z } from "zod";

/** Fields for creating/updating a document (the non-file part of the form). */
export const documentCoreSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().min(1, "Description is required").max(5000),
  price: z.coerce
    .number()
    .min(0, "Price cannot be negative")
    .max(1_000_000, "Price is too large"),
  currency: z.string().trim().min(1).max(8).default("INR"),
  samplePages: z.coerce
    .number()
    .int()
    .min(1, "At least 1 sample page")
    .max(1000)
    .default(5),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  seoTitle: z.string().trim().max(200).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(500).optional().or(z.literal("")),
});
export type DocumentCoreInput = z.infer<typeof documentCoreSchema>;

/** One dynamic metadata value assignment. */
export const metadataValueSchema = z.object({
  metadataId: z.string().uuid(),
  value: z.string().max(2000),
});

export const metadataValuesSchema = z.array(metadataValueSchema).default([]);
export type MetadataValueInput = z.infer<typeof metadataValueSchema>;
