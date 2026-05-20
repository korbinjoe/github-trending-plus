import { getDb } from "@github-trending/db";
import { repositories, repositorySnapshots } from "@github-trending/db";
import { sql } from "drizzle-orm";

/** Max topic chips shown in the home filter bar. */
export const TOPIC_FILTER_LIMIT = 12;

type TopicRow = { topic: string };

export async function getSnapshotTopicFilters(
  limit = TOPIC_FILTER_LIMIT,
): Promise<string[]> {
  const db = getDb();
  const result = await db.execute<TopicRow>(sql`
    SELECT elem AS topic
    FROM ${repositories} r
    INNER JOIN ${repositorySnapshots} rs ON rs.repo_id = r.id
    CROSS JOIN LATERAL jsonb_array_elements_text(r.topics) AS elem
    WHERE elem IS NOT NULL AND trim(elem) <> ''
    GROUP BY elem
    ORDER BY COUNT(DISTINCT r.id) DESC, elem ASC
    LIMIT ${limit}
  `);

  return (result as TopicRow[]).map((row) => row.topic);
}
