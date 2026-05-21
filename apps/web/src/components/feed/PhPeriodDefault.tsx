"use client";

import { defaultFeedPeriod } from "@/lib/feed-params";
import { feedPeriodParser, feedViewParser } from "@/lib/feed-query-nuqs";
import { useQueryState } from "nuqs";
import { useEffect, useRef } from "react";

/** Ensures `?view=ph` without `period` uses week (matches server parseFeedParams). */
export function PhPeriodDefault() {
  const [view] = useQueryState("view", feedViewParser);
  const [period, setPeriod] = useQueryState("period", feedPeriodParser);
  const normalized = useRef(false);

  useEffect(() => {
    if (view !== "ph" || normalized.current) return;

    const url = new URL(window.location.href);
    if (url.searchParams.has("period")) return;

    normalized.current = true;
    const target = defaultFeedPeriod("ph");
    if (period !== target) {
      void setPeriod(target);
    }
  }, [view, period, setPeriod]);

  return null;
}
