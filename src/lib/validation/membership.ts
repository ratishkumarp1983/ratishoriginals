import { z } from "zod";

const boolInput = z.preprocess(
  (v) => (typeof v === "string" ? /^(1|true|yes|on)$/i.test(v.trim()) : v),
  z.boolean(),
);

export const membershipCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  price: z.coerce.number().min(0, "Price cannot be negative").max(1_000_000),
  currency: z.string().trim().min(1).max(8).default("INR"),
  durationDays: z.coerce.number().int().min(1, "Duration must be at least 1 day").max(3650),
  benefits: z.string().trim().max(2000).default(""),
  active: boolInput.default(true),
});
export type MembershipCreateInput = z.infer<typeof membershipCreateSchema>;

export const membershipUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  price: z.coerce.number().min(0).max(1_000_000).optional(),
  currency: z.string().trim().min(1).max(8).optional(),
  durationDays: z.coerce.number().int().min(1).max(3650).optional(),
  benefits: z.string().trim().max(2000).optional(),
  active: boolInput.optional(),
  documentIds: z.array(z.string().uuid()).optional(),
});
export type MembershipUpdateInput = z.infer<typeof membershipUpdateSchema>;
