import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Link } from "@/components/i18n/link";
import { Container } from "@/components/layout/container";
import { LoginFormSkeleton } from "@/components/layout/page-skeleton";
import { getSession, safeNext } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Log in"), robots: { index: false, follow: false } };
}

/** Already signed in: go where they were heading. Half-way (MPIN not set yet): start over. */
async function Login({ searchParams }: { searchParams: PageProps<"/[lang]/login">["searchParams"] }) {
  const { next } = await searchParams;
  const target = typeof next === "string" ? next : null;
  const session = await getSession();
  if (session.status === "signed-in") redirect(safeNext(target));
  return <LoginForm next={target} />;
}

export default async function LoginPage({ searchParams }: PageProps<"/[lang]/login">) {
  const t = await getT();
  return (
    <Container className="flex justify-center py-10 lg:py-20">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-form lg:p-8">
        <h1 className="text-page font-semibold">{t("Log in to Rajkot Offers Hub")}</h1>
        <p className="mt-1 mb-6 text-body-sm text-muted">{t("Use your mobile number. The first time, we send you a code on WhatsApp.")}</p>
        <Suspense fallback={<LoginFormSkeleton />}>
          <Login searchParams={searchParams} />
        </Suspense>
        <p className="mt-6 text-caption leading-relaxed text-muted">
          {t("By continuing, you agree to our terms and privacy policy.")}{" "}
          <Link href="/terms" className="underline hover:text-ink">
            {t("Terms of use")}
          </Link>
          {" · "}
          <Link href="/privacy" className="underline hover:text-ink">
            {t("Privacy policy")}
          </Link>
        </p>
      </div>
    </Container>
  );
}
