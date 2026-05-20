export type HighlightSegment = {
  text: string;
  highlight: boolean;
};

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () =>
    Array<number>(cols).fill(0),
  );

  for (let i = 0; i < rows; i++) matrix[i]![0] = i;
  for (let j = 0; j < cols; j++) matrix[0]![j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost,
      );
    }
  }

  return matrix[rows - 1]![cols - 1]!;
}

function isFuzzyWordMatch(word: string, query: string): boolean {
  if (word.length < 2 || query.length < 2) return false;
  const w = word.toLowerCase();
  const q = query.toLowerCase();
  if (w.includes(q) || q.includes(w)) return true;

  const lenDiff = Math.abs(w.length - q.length);
  if (lenDiff > 3) return false;

  const maxDist = Math.max(1, Math.floor(q.length * 0.34));
  return levenshtein(w, q) <= maxDist;
}

type Range = { start: number; end: number };

function mergeRanges(ranges: Range[]): Range[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: Range[] = [sorted[0]!];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]!;
    const last = merged[merged.length - 1]!;
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push(current);
    }
  }

  return merged;
}

function findSubstringRanges(text: string, token: string): Range[] {
  const ranges: Range[] = [];
  const lowerText = text.toLowerCase();
  const lowerToken = token.toLowerCase();
  let idx = 0;

  while (idx < text.length) {
    const found = lowerText.indexOf(lowerToken, idx);
    if (found === -1) break;
    ranges.push({ start: found, end: found + token.length });
    idx = found + token.length;
  }

  return ranges;
}

function findFuzzyWordRanges(text: string, token: string): Range[] {
  const ranges: Range[] = [];
  const wordPattern = /[\p{L}\p{N}_-]+/gu;
  let match: RegExpExecArray | null;

  while ((match = wordPattern.exec(text)) !== null) {
    const word = match[0];
    if (!isFuzzyWordMatch(word, token)) continue;
    ranges.push({ start: match.index, end: match.index + word.length });
  }

  return ranges;
}

function collectRanges(text: string, query: string): Range[] {
  const tokens = query
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  if (tokens.length === 0) return [];

  const ranges: Range[] = [];
  for (const token of tokens) {
    ranges.push(...findSubstringRanges(text, token));
    ranges.push(...findFuzzyWordRanges(text, token));
  }

  return mergeRanges(ranges);
}

export function getHighlightSegments(
  text: string,
  query: string | undefined,
): HighlightSegment[] {
  if (!text) return [];
  if (!query?.trim()) return [{ text, highlight: false }];

  const ranges = collectRanges(text, query);
  if (ranges.length === 0) return [{ text, highlight: false }];

  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start > cursor) {
      segments.push({
        text: text.slice(cursor, range.start),
        highlight: false,
      });
    }
    segments.push({
      text: text.slice(range.start, range.end),
      highlight: true,
    });
    cursor = range.end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), highlight: false });
  }

  return segments;
}
