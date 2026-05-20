import type { FeedPeriod } from "./types";

export const PERIOD_DAYS: Record<FeedPeriod, number> = {
  today: 1,
  week: 7,
  month: 30,
  halfYear: 180,
  year: 365,
};

/** Anchor offsets (days ago) used for one-time historical snapshot backfill. */
export const BACKFILL_ANCHOR_DAYS = [7, 30, 180, 365] as const;

export function utcDateDaysAgo(days: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export function periodStart(period: FeedPeriod, from: Date = new Date()): Date {
  const days = PERIOD_DAYS[period];
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

/** End of UTC calendar day — aligns with OSS Insight daily history rows. */
export function capturedAtEndOfUtcDay(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.000Z`);
}

export function utcToday(from: Date = new Date()): string {
  return from.toISOString().slice(0, 10);
}

/** UTC calendar date at period start — used as daily star baseline lookup. */
export function periodBaselineDate(
  period: FeedPeriod,
  from: Date = new Date(),
): string {
  return periodStart(period, from).toISOString().slice(0, 10);
}
