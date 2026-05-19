"use client";

import type { FavoriteItem, FavoriteSnapshot } from "@github-trending/core/types";
import { useCallback, useEffect, useState } from "react";
import {
  addFavorite,
  clearFavorites,
  readFavorites,
  removeFavorite,
  sortFavoritesBySavedAt,
  toggleFavorite,
  type FavoritesErrorCode,
  type FavoritesMutationResult,
} from "@/lib/favorites-storage";

const FAVORITES_CHANGED_EVENT = "gtp-favorites-changed";

function notifyFavoritesChanged(): void {
  window.dispatchEvent(new Event(FAVORITES_CHANGED_EVENT));
}

export function useFavorites() {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [lastError, setLastError] = useState<FavoritesErrorCode | null>(null);

  const syncFromStorage = useCallback(() => {
    setItems(sortFavoritesBySavedAt(readFavorites()));
  }, []);

  useEffect(() => {
    syncFromStorage();
    setHydrated(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === "gtp-favorites-v1") {
        syncFromStorage();
      }
    };
    const onLocalChange = () => syncFromStorage();

    window.addEventListener("storage", onStorage);
    window.addEventListener(FAVORITES_CHANGED_EVENT, onLocalChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(FAVORITES_CHANGED_EVENT, onLocalChange);
    };
  }, [syncFromStorage]);

  const applyMutation = useCallback((result: FavoritesMutationResult) => {
    if (result.ok) {
      setLastError(null);
      setItems(sortFavoritesBySavedAt(result.items));
      notifyFavoritesChanged();
    } else {
      setLastError(result.code);
    }
    return result;
  }, []);

  const toggle = useCallback(
    (owner: string, name: string, snapshot?: FavoriteSnapshot) =>
      applyMutation(toggleFavorite(owner, name, snapshot)),
    [applyMutation],
  );

  const add = useCallback(
    (owner: string, name: string, snapshot?: FavoriteSnapshot) =>
      applyMutation(addFavorite(owner, name, snapshot)),
    [applyMutation],
  );

  const remove = useCallback(
    (owner: string, name: string) => {
      const next = removeFavorite(owner, name);
      setLastError(null);
      setItems(sortFavoritesBySavedAt(next));
      notifyFavoritesChanged();
    },
    [],
  );

  const clearAll = useCallback(() => {
    clearFavorites();
    setItems([]);
    setLastError(null);
    notifyFavoritesChanged();
  }, []);

  const isSaved = useCallback(
    (owner: string, name: string) =>
      items.some(
        (item) =>
          item.owner.toLowerCase() === owner.trim().toLowerCase() &&
          item.name.toLowerCase() === name.trim().toLowerCase(),
      ),
    [items],
  );

  return {
    items,
    hydrated,
    lastError,
    toggle,
    add,
    remove,
    clearAll,
    isSaved,
    count: items.length,
  };
}
