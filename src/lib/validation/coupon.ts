import { z } from "zod";

const boolInput = z.preprocess(
  (v) => (typeof v === "string" ? /^(1|true|yes|on)$/i.test(v.trim()) : v),
  z.boolean(),
);

export const couponCreateSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "Code must be at least 3 characters")
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/, "Use letters, digits, hyphens, or underscores"),
    discountType: z.enum(["PERCENTAGE", "FIXED"]),
    discountValue: z.coerce.number().positive("Discount must be greater than 0"),
    expiryDate: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? new Date(v) : null)),
    usageLimit: z
      .union([z.coerce.number().int().positive(), z.literal("")])
      .optional()
      .transform((v) => (v === "" || v == null ? null : Number(v))),
    oneTimePerUser: boolInput.default(false),
    memberOnly: boolInput.default(false),
    documentId: z
      .string()
      .uuid()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    active: boolInput.default(true),
  })
  .refine(
    (d) => d.discountType !== "PERCENTAGE" || d.discountValue <= 100,
    { message: "A percentage discount cannot exceed 100", path: ["discountValue"] },
  );
export type CouponCreateInput = z.infer<typeof couponCreateSchema>;

export const couponUpdateSchema = z.object({
  active: boolInput.optional(),
  expiryDate: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === undefined ? undefined : v ? new Date(v) : null)),
  usageLimit: z
    .union([z.coerce.number().int().positive(), z.literal("")])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "" ? null : Number(v))),
});
