import { z } from "zod";

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  review: z.string().trim().min(1).max(5000),
  containsSpoiler: z.boolean().optional(),
});
export type ReviewInput = z.infer<typeof reviewSchema>;
