import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { MembershipStatus, Role } from "@prisma/client";

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: Role;
  membershipStatus: MembershipStatus;
}

/**
 * Server-side authorization helpers. These are the real security boundary
 * (SRS §8: "All authorization enforced server-side"). Middleware only does
 * coarse UX redirects; every protected page, layout, and route handler calls
 * one of these.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name,
    image: session.user.image,
    role: session.user.role,
    membershipStatus: session.user.membershipStatus,
  };
}

/** Require any authenticated user; redirect to /login otherwise. */
export async function requireUser(callbackUrl?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const target = callbackUrl
      ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/login";
    redirect(target);
  }
  return user;
}

/** Require an admin; redirect readers to the home page. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser("/admin");
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
