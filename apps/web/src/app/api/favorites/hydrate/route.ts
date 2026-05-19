import { FavoritesHydrateRequestSchema } from "@github-trending/core/types";
import { errorResponse, jsonResponse, withRateLimit } from "@/lib/api-utils";
import { hydrateFavorites } from "@/lib/favorites-hydrate-service";

export async function POST(request: Request) {
  const limited = withRateLimit(request);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const parsed = FavoritesHydrateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Invalid request body", 400, {
      details: parsed.error.flatten(),
    });
  }

  const items = await hydrateFavorites(parsed.data.repos);
  return jsonResponse({ items });
}
