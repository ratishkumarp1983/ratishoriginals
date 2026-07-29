import { z } from "zod";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth-constants";

/**
 * Auth input schemas (SRS §8 password policy: 12-char min, 14+ recommended).
 * Shared by the API routes and the client forms.
 */
const passwordField = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(200, "Password is too long");

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: passwordField,
  turnstileToken: z.string().optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  turnstileToken: z.string().optional(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "Invalid reset link"),
  password: passwordField,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
