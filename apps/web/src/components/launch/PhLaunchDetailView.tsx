import type { PhLaunchDetail } from "@github-trending/core/types";
import { phOutboundLinks } from "@github-trending/core/ph-signal-utils";
import { PhDetailPanel } from "@/components/ph/PhDetailPanel";
import { ShareToX } from "@/components/share/ShareToX";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { buildLaunchTweet } from "@/lib/share-text";
import { launchUrl } from "@/lib/site";
import { GithubSlugBlock } from "./GithubSlugBlock";
import { IndexedRepoBridge } from "./IndexedRepoBridge";
import { NotIndexedBanner } from "./NotIndexedBanner";

interface PhLaunchDetailViewProps {
  detail: PhLaunchDetail;
}

export async function PhLaunchDetailView({ detail }: PhLaunchDetailViewProps) {
  const t = await getTranslations("launch");
  const { website } = phOutboundLinks(detail.signal);

  return (
    <>
      <Link href="/?view=ph&period=week" className="page-back">
        ← {t("detailBack")}
      </Link>

      <div className="repo-title-row">
        <h1 className="launch-detail__title">{detail.productName}</h1>
        <div className="title-actions">
          <ShareToX
            text={buildLaunchTweet(detail.productName, detail.signal.tagline, detail.signal.votesCount)}
            url={launchUrl(detail.signal.slug)}
          />
        </div>
      </div>

      <PhDetailPanel signal={detail.signal} productName={detail.productName} />

      {detail.linkage === "indexed" && <IndexedRepoBridge detail={detail} />}

      {detail.linkage === "launch" && (
        <>
          <NotIndexedBanner />
          <GithubSlugBlock detail={detail} />
        </>
      )}

      {detail.linkage === "product" && (
        <section className="panel" aria-labelledby="product-cta-heading">
          <h2 className="panel__title" id="product-cta-heading">
            {t("productCtaTitle")}
          </h2>
          <p className="panel__body">{t("productOnly")}</p>
          {website ? (
            <a
              className="btn btn--primary"
              href={website}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("website")} ↗
            </a>
          ) : (
            <a
              className="btn btn--primary"
              href={detail.signal.phUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("websitePhLink")} ↗
            </a>
          )}
        </section>
      )}

      <p className="ph-attribution launch-detail__attribution">
        {t("detailAttribution")}
      </p>
    </>
  );
}
