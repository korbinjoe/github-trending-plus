import { errorResponse, jsonResponse, withRateLimit } from "@/lib/api-utils";
import { getRepoDetail } from "@/lib/repo-service";

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
  const detail = await getRepoDetail(owner, name, period);

  if (!detail) {
    return errorResponse("Repository not found", 404);
  }

  return jsonResponse(detail);
}
