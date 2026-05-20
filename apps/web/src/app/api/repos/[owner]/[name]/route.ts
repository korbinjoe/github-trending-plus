import { errorResponse, jsonResponse, withRateLimit } from "@/lib/api-utils";
import { getCachedRepoDetail } from "@/lib/cached-repo-detail";

export const revalidate = 600;

export async function GET(
  request: Request,
  context: { params: Promise<{ owner: string; name: string }> },
) {
  const limited = withRateLimit(request);
  if (limited) return limited;

  const { owner, name } = await context.params;
  const url = new URL(request.url);
  const period = url.searchParams.get("period") ?? undefined;
  const detail = await getCachedRepoDetail(owner, name, period);

  if (!detail) {
    return errorResponse("Repository not found", 404);
  }

  return jsonResponse(detail);
}
