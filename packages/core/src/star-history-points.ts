export interface StarHistoryPoint {
  date: string;
  stargazers: number;
}

/** Rows must be sorted by `date` ascending (YYYY-MM-DD). */
export function pickStarsAtOrBefore(
  rows: StarHistoryPoint[],
  targetDate: string,
): number | null {
  let result: number | null = null;
  for (const row of rows) {
    if (row.date <= targetDate) {
      result = row.stargazers;
    } else {
      break;
    }
  }
  return result;
}

export function parseOssInsightStargazers(value: string | number): number {
  const n = typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
}
