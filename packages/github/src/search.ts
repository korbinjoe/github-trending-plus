import type { GitHubGraphQLClient } from "./client";
import { enrichCommits30d } from "./commit-enrich";
import {
  DAILY_CANDIDATE_CAP_PER_LANGUAGE,
  getSearchPushedSince,
  MIN_STARS_SEARCH,
  type IngestLanguage,
} from "./config";
import type { IngestLogger } from "./ingest-logger";
import type { SearchRepoNode } from "./search-node";

export type { SearchRepoNode } from "./search-node";

/** Smaller pages avoid GitHub nginx 502 on heavy nested fields. */
const SEARCH_PAGE_SIZE = 30;

const SEARCH_QUERY = `
query SearchRepos($q: String!, $after: String) {
  rateLimit { cost remaining resetAt }
  search(type: REPOSITORY, query: $q, first: ${SEARCH_PAGE_SIZE}, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes {
      ... on Repository {
        databaseId
        nameWithOwner
        stargazerCount
        forkCount
        pushedAt
        description
        isFork
        primaryLanguage { name }
        licenseInfo { spdxId }
        repositoryTopics(first: 10) {
          nodes { topic { name } }
        }
      }
    }
  }
}
`;

function buildQuery(language: IngestLanguage): string {
  const pushed = getSearchPushedSince(30);
  return `language:${language} pushed:>${pushed} stars:>=${MIN_STARS_SEARCH} fork:false archived:false`;
}

export async function searchCandidatesForLanguage(
  client: GitHubGraphQLClient,
  language: IngestLanguage,
  cap = DAILY_CANDIDATE_CAP_PER_LANGUAGE,
  logger?: IngestLogger,
): Promise<SearchRepoNode[]> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 30);
  const sinceIso = since.toISOString();

  const results: SearchRepoNode[] = [];
  let after: string | null = null;
  let page = 0;
  const q = buildQuery(language);

  logger?.info("search_start", { language, cap });

  type SearchResult = {
    search: {
      pageInfo: { hasNextPage: boolean; endCursor: string };
      nodes: (SearchRepoNode | null)[];
    };
  };

  while (results.length < cap) {
    page += 1;
    logger?.info("search_page_fetch", { language, page });
    const response: { data: SearchResult } = await client.query<SearchResult>(
      SEARCH_QUERY,
      { q, after },
    );
    const data: SearchResult = response.data;

    const nodes = data.search.nodes.filter(
      (n: SearchRepoNode | null): n is SearchRepoNode =>
        n !== null && Boolean(n.nameWithOwner),
    );
    await enrichCommits30d(client, nodes, sinceIso);
    results.push(...nodes);

    logger?.info("search_page_done", {
      language,
      page,
      pageSize: nodes.length,
      total: results.length,
    });

    if (!data.search.pageInfo.hasNextPage || results.length >= cap) {
      break;
    }
    after = data.search.pageInfo.endCursor;
  }

  const sliced = results.slice(0, cap);
  logger?.info("search_done", { language, total: sliced.length });
  return sliced;
}
