import { getHighlightSegments } from "@/lib/highlight-text";

type HighlightedTextProps = {
  text: string;
  query?: string;
  className?: string;
};

export function HighlightedText({
  text,
  query,
  className,
}: HighlightedTextProps) {
  const segments = getHighlightSegments(text, query);

  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.highlight ? (
          <mark key={index} className="search-highlight">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </span>
  );
}
