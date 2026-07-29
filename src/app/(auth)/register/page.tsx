import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";
import { GoogleButton } from "@/components/auth/google-button";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isGoogleEnabled } from "@/lib/env";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  if (await getCurrentUser()) redirect("/");
  const { callbackUrl } = await searchParams;
  const target = callbackUrl ?? "/";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Join Ratish Originals to buy and read.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isGoogleEnabled() && (
          <>
            <GoogleButton callbackUrl={target} />
            <div className="flex items-center gap-3 text-xs text-neutral-400">
              <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
              or
              <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
            </div>
          </>
        )}
        <RegisterForm callbackUrl={target} />
        <p className="text-center text-sm text-neutral-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
