"use client";

import { FeedList } from "@/components/feed/FeedList";
import { FilterBar } from "@/components/feed/FilterBar";
import { Hero } from "@/components/layout/Hero";
import { Suspense, useState } from "react";

interface HomeFeedProps {
  topicFilters: string[];
}

export function HomeFeed({ topicFilters }: HomeFeedProps) {
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  return (
    <>
      <Hero updatedAt={updatedAt} />
      <Suspense fallback={null}>
        <FilterBar topicFilters={topicFilters} />
        <FeedList onUpdatedAt={setUpdatedAt} />
      </Suspense>
    </>
  );
}
