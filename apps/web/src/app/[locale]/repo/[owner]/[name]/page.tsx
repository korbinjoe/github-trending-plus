import { RepoAlternativesSection } from "@/components/repo/RepoAlternativesSection";
import { RepoDetailMain } from "@/components/repo/RepoDetailMain";
import { getCachedRepoDetailCore } from "@/lib/cached-repo-detail";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import RepoDetailLoading from "./loading";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string; name: string }>;
}): Promise<Metadata> {
  const { owner, name } = await params;
  const detail = await getCachedRepoDetailCore(owner, name);

  const title = detail
    ? `${owner}/${name} — ${detail.description || "Trending8"}`
    : `${owner}/${name} · Trending8`;

  return {
    title,
    description: detail?.description || undefined,
    twitter: { card: "summary_large_image" },
  };
}

function RepoAltSkeleton() {
  return (
    <section className="panel repo-alt-skeleton" aria-hidden="true">
      <div className="skeleton repo-alt-skeleton__title" />
      <div className="skeleton repo-alt-skeleton__line" />
      <div className="skeleton repo-alt-skeleton__line" />
    </section>
  );
}

export default async function RepoPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; owner: string; name: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { locale, owner, name } = await params;
  const { period } = await searchParams;
  setRequestLocale(locale);

  return (
    <>
      <Suspense fallback={<RepoDetailLoading />}>
        <RepoDetailMain
          owner={owner}
          name={name}
          period={period}
          locale={locale}
        />
      </Suspense>
      <Suspense fallback={<RepoAltSkeleton />}>
        <RepoAlternativesSection
          owner={owner}
          name={name}
          period={period}
        />
      </Suspense>
    </>
  );
}
