import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

interface HeroProps {
  updatedAt?: string | null;
}

export async function Hero({ updatedAt }: HeroProps) {
  const t = await getTranslations("hero");
  const date = updatedAt
    ? new Date(updatedAt).toISOString().slice(0, 16).replace("T", " ")
    : "—";

  return (
    <section className="hero">
      <h1>{t("title")}</h1>
      <p className="hero-meta">
        {t.rich("meta", {
          date,
          rules: (chunks) => (
            <Link href="/about#ranking">{chunks}</Link>
          ),
        })}
      </p>
      <p className="hero-meta">
        {t.rich("tzNote", {
          glossary: (chunks) => (
            <Link href="/about#signals">{chunks}</Link>
          ),
        })}
      </p>
    </section>
  );
}
