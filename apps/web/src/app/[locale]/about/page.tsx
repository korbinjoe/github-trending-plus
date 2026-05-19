import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  return (
    <section className="py-6 prose prose-invert max-w-none">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted mt-4">{t("disclaimer")}</p>
      <h2 id="favorites" className="text-lg font-semibold mt-8">
        {t("favoritesTitle")}
      </h2>
      <p className="text-muted mt-2 text-sm">{t("favoritesBody")}</p>
      <h2 id="ranking" className="text-lg font-semibold mt-8">
        Ranking rules
      </h2>
      <ul className="list-disc pl-5 mt-2 text-muted space-y-2 text-sm">
        <li>Velocity: absolute stars gained in the selected period.</li>
        <li>Early Signal: total stars &lt; 5k and top 20% relative growth per language.</li>
        <li>Default exclusions: Awesome lists and repos with 0 commits in 30 days.</li>
        <li>Health: green ≥5 commits, yellow 1–4, red 0 (30d).</li>
      </ul>
    </section>
  );
}
