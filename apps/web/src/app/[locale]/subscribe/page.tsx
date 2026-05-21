import { FeedSubscriptionRow } from "@/components/subscribe/FeedSubscriptionRow";
import { getFeedDirectory } from "@/lib/feeds-config";
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function SubscribePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("subscribe");
  const feeds = getFeedDirectory();

  return (
    <section className="py-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted mt-2 mb-8">{t("description")}</p>
      <div className="divide-y divide-border">
        {feeds.map((feed) => (
          <FeedSubscriptionRow
            key={feed.url}
            title={feed.title}
            description={feed.description}
            url={feed.url}
          />
        ))}
      </div>
    </section>
  );
}
