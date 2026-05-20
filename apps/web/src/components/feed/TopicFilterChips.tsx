"use client";

import { useTranslations } from "next-intl";
import { parseAsString, useQueryState } from "nuqs";
import { useMemo } from "react";

interface TopicFilterChipsProps {
  topicFilters: string[];
}

export function TopicFilterChips({ topicFilters }: TopicFilterChipsProps) {
  const t = useTranslations("filter");
  const [topic, setTopic] = useQueryState("topic", parseAsString.withDefault(""));

  const chips = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const value of topicFilters) {
      if (!seen.has(value)) {
        seen.add(value);
        ordered.push(value);
      }
    }
    if (topic && !seen.has(topic)) {
      ordered.push(topic);
    }
    return ordered;
  }, [topicFilters, topic]);

  return (
    <section className="topics" role="group" aria-label={t("topicsGroup")}>
      <button
        type="button"
        className={`chip ${topic === "" ? "is-on" : ""}`}
        onClick={() => setTopic(null)}
      >
        {t("topicAll")}
      </button>
      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          className={`chip ${topic === chip ? "is-on" : ""}`}
          onClick={() => setTopic(chip)}
        >
          {chip}
        </button>
      ))}
    </section>
  );
}
