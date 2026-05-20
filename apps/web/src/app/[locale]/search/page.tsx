import { SearchResults } from "@/components/search/SearchResults";
import { FeedListSkeleton } from "@/components/feed/FeedListSkeleton";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

export default async function SearchPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("search");

  return (
    <section className="search-page">
      <header className="search-hero">
        <h1>{t("title")}</h1>
        <p className="search-hero__scope">{t("scopeNote")}</p>
      </header>
      <Suspense fallback={<FeedListSkeleton label={t("submit")} />}>
        <SearchResults />
      </Suspense>
    </section>
  );
}
