import {
  FAVORITES_MAX_ITEMS,
  FAVORITES_STORAGE_KEY,
  FavoritesDocumentSchema,
  type FavoriteItem,
  type FavoriteSnapshot,
  type FavoritesDocument,
} from "@github-trending/core/types";

export type FavoritesErrorCode = "invalid_id" | "limit_reached";

export type FavoritesMutationResult =
  | { ok: true; items: FavoriteItem[] }
  | { ok: false; code: FavoritesErrorCode };

export function favoriteKey(owner: string, name: string): string {
  return `${owner.trim()}/${name.trim()}`.toLowerCase();
}

function normalizeRef(
  owner: string,
  name: string,
): { owner: string; name: string } | null {
  const o = owner.trim();
  const n = name.trim();
  if (!o || !n) return null;
  return { owner: o, name: n };
}

function storageAvailable(): boolean {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

export function readFavorites(): FavoriteItem[] {
  if (!storageAvailable()) return [];
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    const doc = FavoritesDocumentSchema.safeParse(parsed);
    if (!doc.success) return [];
    return doc.data.items;
  } catch {
    return [];
  }
}

export function writeFavorites(items: FavoriteItem[]): void {
  if (!storageAvailable()) return;
  const doc: FavoritesDocument = { version: 1, items };
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(doc));
}

export function isFavorited(
  items: FavoriteItem[],
  owner: string,
  name: string,
): boolean {
  const key = favoriteKey(owner, name);
  return items.some((item) => favoriteKey(item.owner, item.name) === key);
}

export function addFavorite(
  owner: string,
  name: string,
  snapshot?: FavoriteSnapshot,
): FavoritesMutationResult {
  const ref = normalizeRef(owner, name);
  if (!ref) return { ok: false, code: "invalid_id" };

  const items = readFavorites();
  const key = favoriteKey(ref.owner, ref.name);
  const now = new Date().toISOString();
  const existingIdx = items.findIndex(
    (item) => favoriteKey(item.owner, item.name) === key,
  );

  if (existingIdx >= 0) {
    const existing = items[existingIdx]!;
    const updated: FavoriteItem = {
      ...existing,
      owner: ref.owner,
      name: ref.name,
      savedAt: now,
      snapshot: snapshot ?? existing.snapshot,
    };
    const next = [...items];
    next[existingIdx] = updated;
    writeFavorites(next);
    return { ok: true, items: next };
  }

  if (items.length >= FAVORITES_MAX_ITEMS) {
    return { ok: false, code: "limit_reached" };
  }

  const entry: FavoriteItem = {
    owner: ref.owner,
    name: ref.name,
    savedAt: now,
    snapshot,
  };
  const next = [entry, ...items];
  writeFavorites(next);
  return { ok: true, items: next };
}

export function removeFavorite(
  owner: string,
  name: string,
): FavoriteItem[] {
  const key = favoriteKey(owner, name);
  const next = readFavorites().filter(
    (item) => favoriteKey(item.owner, item.name) !== key,
  );
  writeFavorites(next);
  return next;
}

export function toggleFavorite(
  owner: string,
  name: string,
  snapshot?: FavoriteSnapshot,
): FavoritesMutationResult {
  if (isFavorited(readFavorites(), owner, name)) {
    return { ok: true, items: removeFavorite(owner, name) };
  }
  return addFavorite(owner, name, snapshot);
}

export function clearFavorites(): void {
  writeFavorites([]);
}

export function sortFavoritesBySavedAt(items: FavoriteItem[]): FavoriteItem[] {
  return [...items].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );
}
