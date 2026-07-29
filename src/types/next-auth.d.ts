import type { DefaultSession } from "next-auth";
import type { MembershipStatus, Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      membershipStatus: MembershipStatus;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    membershipStatus?: MembershipStatus;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: Role;
    membershipStatus?: MembershipStatus;
    tv?: number;
  }
}
