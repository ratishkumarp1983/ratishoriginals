import { describe, expect, it } from "vitest";
import { newResetToken, hashResetToken } from "@/lib/reset-token";
import {
  registerSchema,
  loginSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";

describe("reset tokens", () => {
  it("stores a hash, not the raw token, and the hash is reproducible", () => {
    const { token, hash } = newResetToken();
    expect(token).not.toEqual(hash);
    expect(hash).toEqual(hashResetToken(token));
    expect(hash).toMatch(/^[0-9a-f]{64}$/); // sha-256 hex
  });

  it("different tokens hash differently", () => {
    expect(newResetToken().hash).not.toEqual(newResetToken().hash);
  });
});

describe("auth validation", () => {
  it("normalises email and enforces the 12-char password policy", () => {
    const ok = registerSchema.safeParse({
      name: "A",
      email: "  User@Example.COM ",
      password: "longenough12",
    });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.email).toBe("user@example.com");

    const short = registerSchema.safeParse({
      name: "A",
      email: "a@b.com",
      password: "short",
    });
    expect(short.success).toBe(false);
  });

  it("login requires a non-empty password", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.com", password: "" }).success,
    ).toBe(false);
  });

  it("reset requires a token and a strong password", () => {
    expect(
      resetPasswordSchema.safeParse({ token: "x", password: "longenough12" })
        .success,
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({
        token: "0123456789abcdef",
        password: "longenough12",
      }).success,
    ).toBe(true);
  });
});
