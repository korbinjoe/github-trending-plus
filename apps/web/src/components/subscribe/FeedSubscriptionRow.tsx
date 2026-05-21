"use client";

import { useCallback, useState } from "react";

interface FeedSubscriptionRowProps {
  title: string;
  description: string;
  url: string;
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through to legacy copy */
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

export function FeedSubscriptionRow({
  title,
  description,
  url,
}: FeedSubscriptionRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(url);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [url]);

  return (
    <div className="feed-item flex flex-col gap-3 py-4 border-b border-border sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted">{description}</p>
      </div>
      <div className="feed-item__actions flex min-w-0 w-full items-center gap-2 sm:w-auto sm:max-w-[min(100%,28rem)]">
        <div className="min-w-0 flex-1">
          <code className="block truncate text-xs bg-surface px-2 py-1 rounded font-mono">
            {url}
          </code>
        </div>
        <button
          type="button"
          className="feed-item__copy relative z-10 shrink-0 text-xs text-accent border border-border px-2 py-1 rounded"
          onClick={() => void handleCopy()}
          aria-label={`Copy feed URL for ${title}`}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
