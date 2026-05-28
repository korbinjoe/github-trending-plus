"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface Top8Data {
  text: string;
  url: string;
}

interface FeedLoadingContextValue {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  top8: Top8Data | null;
  setTop8: (data: Top8Data | null) => void;
}

const FeedLoadingContext = createContext<FeedLoadingContextValue | null>(null);

export function FeedLoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [top8, setTop8] = useState<Top8Data | null>(null);
  const value = useMemo(
    () => ({ isLoading, setIsLoading, top8, setTop8 }),
    [isLoading, top8],
  );
  return (
    <FeedLoadingContext.Provider value={value}>
      {children}
    </FeedLoadingContext.Provider>
  );
}

export function useFeedLoading(): FeedLoadingContextValue {
  const ctx = useContext(FeedLoadingContext);
  if (!ctx) {
    throw new Error("useFeedLoading must be used within FeedLoadingProvider");
  }
  return ctx;
}
