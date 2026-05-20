import { periodBaselineDate } from "./periods";
import { pickStarsAtOrBefore, type StarHistoryPoint } from "./star-history-points";
import type { FeedPeriod } from "./types";

export function resolveBaselineStars(
  period: FeedPeriod,
  snapshotBaseline: number,
  dailyHistory: StarHistoryPoint[],
): number {
  if (period === "today") {
    return snapshotBaseline;
  }
  if (dailyHistory.length === 0) {
    return snapshotBaseline;
  }
  const baselineDate = periodBaselineDate(period);
  const fromDaily = pickStarsAtOrBefore(dailyHistory, baselineDate);
  return fromDaily ?? snapshotBaseline;
}
