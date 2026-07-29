import { z } from "zod";

/** Machine key: lowercase, digits, underscores. Derived from the name if blank. */
const keyField = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9_]*$/, "Key must be lowercase letters, digits, underscores")
  .max(50);

export const metadataCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  key: keyField.optional(),
  type: z.enum(["TEXT", "NUMBER", "DATE", "BOOLEAN", "SELECT"]).default("TEXT"),
  displayOrder: z.coerce.number().int().min(0).max(1000).default(0),
  active: z.coerce.boolean().default(true),
});
export type MetadataCreateInput = z.infer<typeof metadataCreateSchema>;

export const metadataUpdateSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  type: z.enum(["TEXT", "NUMBER", "DATE", "BOOLEAN", "SELECT"]).optional(),
  displayOrder: z.coerce.number().int().min(0).max(1000).optional(),
  active: z.coerce.boolean().optional(),
});
export type MetadataUpdateInput = z.infer<typeof metadataUpdateSchema>;
