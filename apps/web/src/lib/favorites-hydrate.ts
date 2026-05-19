import {
  FavoritesHydrateResponseSchema,
  type FavoriteHydrateResult,
  type FavoriteRepoRef,
} from "@github-trending/core/types";

const HYDRATE_BATCH_SIZE = 50;

export async function hydrateFavoritesClient(
  repos: FavoriteRepoRef[],
): Promise<FavoriteHydrateResult[]> {
  if (repos.length === 0) return [];

  const merged: FavoriteHydrateResult[] = [];
  for (let i = 0; i < repos.length; i += HYDRATE_BATCH_SIZE) {
    const batch = repos.slice(i, i + HYDRATE_BATCH_SIZE);
    const res = await fetch("/api/favorites/hydrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repos: batch }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? "Hydrate failed");
    }

    const json: unknown = await res.json();
    const parsed = FavoritesHydrateResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error("Invalid hydrate response");
    }
    merged.push(...parsed.data.items);
  }

  return merged;
}
