const MAX_TWEET_LENGTH = 280;
const URL_DISPLAY_LENGTH = 23; // X counts all URLs as 23 chars

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}

export function buildRepoCardTweet(
  owner: string,
  name: string,
  description: string,
  deltaStars: number,
): string {
  const suffix = ` | +${deltaStars} ⭐ via #Trending8`;
  const header = `🔥 ${owner}/${name}`;
  const budget = MAX_TWEET_LENGTH - URL_DISPLAY_LENGTH - 1 - header.length - suffix.length - 3;
  const desc = description ? ` — ${truncate(description, budget)}` : "";
  return `${header}${desc}${suffix}`;
}

const PERIOD_EN: Record<string, string> = {
  "filter.today": "today",
  "filter.week": "week",
  "filter.month": "month",
  "filter.halfYear": "6 months",
  "filter.year": "year",
};

export function buildRepoTweet(
  owner: string,
  name: string,
  description: string,
  deltaStars: number,
  periodKey: string,
): string {
  const period = PERIOD_EN[periodKey] ?? "today";
  const header = `🔥 ${owner}/${name}`;
  const footer = `⭐ +${deltaStars} stars this ${period}\n\nvia #Trending8`;
  const budget = MAX_TWEET_LENGTH - URL_DISPLAY_LENGTH - 1 - header.length - footer.length - 4;
  const desc = description ? ` — ${truncate(description, budget)}` : "";
  return `${header}${desc}\n\n${footer}`;
}

export function buildLaunchTweet(
  productName: string,
  tagline: string | undefined,
  votesCount: number,
): string {
  const header = `🚀 ${productName}`;
  const footer = `🏆 ${votesCount} upvotes on Product Hunt\n\nvia #Trending8`;
  const budget = MAX_TWEET_LENGTH - URL_DISPLAY_LENGTH - 1 - header.length - footer.length - 4;
  const desc = tagline ? ` — ${truncate(tagline, budget)}` : "";
  return `${header}${desc}\n\n${footer}`;
}

export function buildPhCardTweet(
  productName: string,
  tagline: string | undefined,
  votesCount: number,
): string {
  const suffix = ` | ${votesCount} upvotes via #Trending8`;
  const header = `🚀 ${productName}`;
  const budget = MAX_TWEET_LENGTH - URL_DISPLAY_LENGTH - 1 - header.length - suffix.length - 3;
  const desc = tagline ? ` — ${truncate(tagline, budget)}` : "";
  return `${header}${desc}${suffix}`;
}

export function buildTop8Tweet(
  items: { owner: string; name: string; description: string; deltaStars: number }[],
): string {
  const header = "🔥 Today's Top 8 on GitHub\n\n";
  const footer = "\n\nvia #Trending8";
  const budget = MAX_TWEET_LENGTH - URL_DISPLAY_LENGTH - 1 - header.length - footer.length;
  const top = items.slice(0, 8);

  const bases = top.map(({ owner, name, deltaStars }, i) => {
    const stars = deltaStars > 0 ? ` +${deltaStars}★` : "";
    return `${i + 1}. ${owner}/${name}${stars}`;
  });
  const baseLen = bases.join("\n").length;
  const perItem = Math.floor((budget - baseLen) / top.length) - 4;

  if (perItem >= 3) {
    const lines = top.map(({ owner, name, description, deltaStars }, i) => {
      const stars = deltaStars > 0 ? ` +${deltaStars}★` : "";
      const desc = description ? ` — ${truncate(description, perItem)}` : "";
      return `${i + 1}. ${owner}/${name}${desc}${stars}`;
    });
    const text = lines.join("\n");
    if (text.length <= budget) return `${header}${text}${footer}`;
  }

  return `${header}${bases.join("\n")}${footer}`;
}

export function buildShareUrl(text: string, url: string): string {
  const params = new URLSearchParams({ text, url });
  return `https://x.com/intent/tweet?${params.toString()}`;
}
