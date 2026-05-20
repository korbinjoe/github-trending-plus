import { RepoAlternativesSection } from "@/components/repo/RepoAlternativesSection";
import { RepoDetailView } from "@/components/repo/RepoDetailView";
import { getCachedRepoDetailCore } from "@/lib/cached-repo-detail";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export const revalidate = 600;

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

  const detail = await getCachedRepoDetailCore(owner, name, period);
  if (!detail) notFound();

  const primary = {
    owner: detail.owner,
    name: detail.name,
    slug: detail.slug,
    description: detail.description,
    deltaStars: detail.deltaStars,
    health: detail.health,
    license: detail.license,
  };

  return (
    <>
      <RepoDetailView detail={detail} locale={locale} />
      <Suspense fallback={<RepoAltSkeleton />}>
        <RepoAlternativesSection
          owner={owner}
          name={name}
          period={period}
          primary={primary}
        />
      </Suspense>
    </>
  );
}
