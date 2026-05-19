import { FavoritesList } from "@/components/favorites/FavoritesList";
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function FavoritesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("favorites");

  return (
    <section className="favorites-page">
      <header className="favorites-hero">
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
      </header>
      <FavoritesList locale={locale} />
    </section>
  );
}
