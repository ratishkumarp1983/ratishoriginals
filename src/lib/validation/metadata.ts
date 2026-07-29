import { z } from "zod";

/**
 * Boolean that also accepts the string forms JSON/form clients send. Unlike
 * z.coerce.boolean() (where any non-empty string, including "false", is true),
 * this treats "false"/"0"/"no"/"off" as false.
 */
const boolInput = z.preprocess(
  (v) =>
    typeof v === "string" ? /^(1|true|yes|on)$/i.test(v.trim()) : v,
  z.boolean(),
);

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
  active: boolInput.default(true),
});
export type MetadataCreateInput = z.infer<typeof metadataCreateSchema>;

export const metadataUpdateSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  type: z.enum(["TEXT", "NUMBER", "DATE", "BOOLEAN", "SELECT"]).optional(),
  displayOrder: z.coerce.number().int().min(0).max(1000).optional(),
  active: boolInput.optional(),
});
export type MetadataUpdateInput = z.infer<typeof metadataUpdateSchema>;
