import { getCachedPhLaunchDetail } from "@/lib/cached-ph-launch-detail";
import { ImageResponse } from "next/og";

export const revalidate = 300;
export const alt = "Product Hunt launch stats";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getCachedPhLaunchDetail(slug);

  const productName = detail?.productName ?? slug;
  const tagline = detail?.signal.tagline ?? "";
  const votes = detail?.signal.votesCount ?? 0;
  const date = detail
    ? (detail.signal.featuredAt ?? detail.signal.postedAt).slice(0, 10)
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 80px",
          background: "linear-gradient(135deg, #0c0e12 0%, #151921 100%)",
          color: "#e8eaed",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "12px",
          }}
        >
          <span
            style={{
              fontSize: "18px",
              color: "#8b95a8",
              letterSpacing: "0.05em",
              textTransform: "uppercase" as const,
            }}
          >
            Trending8 · Product Hunt
          </span>
        </div>

        <h1
          style={{
            fontSize: "52px",
            fontWeight: 700,
            margin: "0 0 20px",
            lineHeight: 1.15,
            color: "#e8eaed",
          }}
        >
          🚀 {productName}
        </h1>

        {tagline && (
          <p
            style={{
              fontSize: "24px",
              color: "#8b95a8",
              margin: "0 0 40px",
              lineHeight: 1.4,
              maxWidth: "900px",
            }}
          >
            {tagline.length > 120 ? tagline.slice(0, 119) + "…" : tagline}
          </p>
        )}

        <div
          style={{
            display: "flex",
            gap: "40px",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "16px", color: "#8b95a8" }}>Upvotes</span>
            <span
              style={{ fontSize: "42px", fontWeight: 700, color: "#f0b429" }}
            >
              {votes}
            </span>
          </div>

          {date && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              <span style={{ fontSize: "16px", color: "#8b95a8" }}>
                Launch date
              </span>
              <span style={{ fontSize: "42px", fontWeight: 700 }}>{date}</span>
            </div>
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
