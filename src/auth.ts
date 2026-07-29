import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validation/auth";
import { env, isGoogleEnabled } from "@/lib/env";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import type { MembershipStatus, Role } from "@prisma/client";

/**
 * Auth.js v5 configuration (SRS FR-1).
 *
 * - Google OAuth (enabled only when credentials are configured)
 * - Email/password via Credentials, verified against an Argon2id hash
 * - JWT session strategy (required by the Credentials provider), carrying the
 *   user's id, role, and membership status so authorization is cheap and
 *   server-side.
 */
const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(raw, request) {
      const parsed = loginSchema.safeParse(raw);
      if (!parsed.success) return null;
      const { email, password } = parsed.data;

      // Throttle credential stuffing: cap attempts per IP and per account.
      const ip = clientIp(new Headers(request?.headers as HeadersInit));
      const byIp = await rateLimit(`login-ip:${ip}`, 15, 60_000);
      const byEmail = await rateLimit(`login-email:${email}`, 8, 5 * 60_000);
      if (!byIp.success || !byEmail.success) return null;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.passwordHash) return null;

      const ok = await verifyPassword(user.passwordHash, password);
      if (!ok) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        membershipStatus: user.membershipStatus,
        tokenVersion: user.tokenVersion,
      };
    },
  }),
];

if (isGoogleEnabled()) {
  providers.push(
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  trustHost: env.AUTH_TRUST_HOST,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      // On sign-in, copy identity/authorization claims into the token.
      if (user) {
        token.uid = user.id;
        token.role = (user as { role?: Role }).role ?? "READER";
        token.membershipStatus =
          (user as { membershipStatus?: MembershipStatus }).membershipStatus ??
          "NONE";
        token.tv = (user as { tokenVersion?: number }).tokenVersion ?? 0;
        return token;
      }

      // On every subsequent request, re-read the user so that role and
      // membership stay current, and a password reset (which bumps
      // tokenVersion) invalidates previously-issued tokens.
      if (token.uid) {
        try {
          const fresh = await prisma.user.findUnique({
            where: { id: token.uid as string },
            select: { role: true, membershipStatus: true, tokenVersion: true },
          });
          if (!fresh) return null; // user deleted
          if ((token.tv ?? 0) !== fresh.tokenVersion) return null; // revoked
          token.role = fresh.role;
          token.membershipStatus = fresh.membershipStatus;
        } catch {
          // Keep the existing token on a transient DB error (fail open).
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as Role;
        session.user.membershipStatus =
          token.membershipStatus as MembershipStatus;
      }
      return session;
    },
  },
  events: {
    // Persist the Google account id onto the user record for future reference.
    async signIn({ user, account }) {
      if (account?.provider === "google" && user?.id) {
        await prisma.user.updateMany({
          where: { id: user.id, googleId: null },
          data: {
            googleId: account.providerAccountId,
            emailVerified: new Date(),
          },
        });
      }
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
