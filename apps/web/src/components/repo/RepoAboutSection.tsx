import { isReadmeCollapsible } from "@/lib/readme-preview";
import { getTranslations } from "next-intl/server";
import { RepoReadmeMarkdown } from "@/components/repo/RepoReadmeMarkdown";

interface RepoAboutSectionProps {
  description: string;
  tags: string[];
  phTagline?: string;
  readmeMarkdown: string | null;
}

function buildFallbackLead(
  phTagline: string | undefined,
  tags: string[],
): string | null {
  const ph = phTagline?.trim();
  if (ph) return ph;

  if (tags.length > 0) {
    return tags.slice(0, 6).join(" · ");
  }

  return null;
}

export async function RepoAboutSection({
  description,
  tags,
  phTagline,
  readmeMarkdown,
}: RepoAboutSectionProps) {
  const t = await getTranslations("repo.about");
  const hasDescription = Boolean(description.trim());
  const lead = hasDescription ? null : buildFallbackLead(phTagline, tags);
  const hasReadme = Boolean(readmeMarkdown?.trim());
  const collapsible = hasReadme && isReadmeCollapsible(readmeMarkdown ?? "");

  if (!lead && !hasReadme) {
    return (
      <section className="panel repo-about" aria-labelledby="repo-about-heading">
        <h2 className="panel__title" id="repo-about-heading">
          {t("title")}
        </h2>
        <p className="repo-about__empty">{t("empty")}</p>
      </section>
    );
  }

  return (
    <section className="panel repo-about" aria-labelledby="repo-about-heading">
      <h2 className="panel__title" id="repo-about-heading">
        {t("title")}
      </h2>

      {lead && <p className="repo-about__lead repo-about__lead--fallback">{lead}</p>}

      {hasReadme && readmeMarkdown && (
        <div
          className={
            collapsible
              ? "repo-readme-wrap repo-readme-wrap--collapsible"
              : "repo-readme-wrap"
          }
        >
          <div className="markdown-body repo-readme__content">
            <RepoReadmeMarkdown markdown={readmeMarkdown} />
          </div>
          {collapsible && (
            <details className="repo-readme__toggle">
              <summary>
                <span className="repo-readme__toggle-more">{t("showMore")}</span>
                <span className="repo-readme__toggle-less">{t("showLess")}</span>
              </summary>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
