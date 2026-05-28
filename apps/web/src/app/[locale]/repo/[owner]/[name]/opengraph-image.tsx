import { getCachedRepoDetailCore } from "@/lib/cached-repo-detail";
import { ImageResponse } from "next/og";

export const revalidate = 600;
export const alt = "Repository stats";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ owner: string; name: string }>;
}) {
  const { owner, name } = await params;
  const detail = await getCachedRepoDetailCore(owner, name);

  const title = `${owner}/${name}`;
  const desc = detail?.description ?? "";
  const delta = detail ? `+${detail.deltaStars}` : "—";
  const total = detail ? detail.totalStars.toLocaleString() : "—";
  const lang = detail?.language ?? "";
  const health = detail?.health ?? "active";

  const healthColor =
    health === "active" ? "#3dd68c" : health === "fair" ? "#f0b429" : "#f07178";

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
            Trending8
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
          {title}
        </h1>

        {desc && (
          <p
            style={{
              fontSize: "24px",
              color: "#8b95a8",
              margin: "0 0 40px",
              lineHeight: 1.4,
              maxWidth: "900px",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {desc.length > 120 ? desc.slice(0, 119) + "…" : desc}
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
            <span style={{ fontSize: "16px", color: "#8b95a8" }}>
              Stars gained
            </span>
            <span
              style={{ fontSize: "36px", fontWeight: 700, color: "#3dd68c" }}
            >
              {delta} ★
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "16px", color: "#8b95a8" }}>
              Total stars
            </span>
            <span style={{ fontSize: "36px", fontWeight: 700 }}>{total}</span>
          </div>

          {lang && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              <span style={{ fontSize: "16px", color: "#8b95a8" }}>
                Language
              </span>
              <span style={{ fontSize: "36px", fontWeight: 700 }}>{lang}</span>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "16px", color: "#8b95a8" }}>Health</span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  background: healthColor,
                }}
              />
              <span style={{ fontSize: "36px", fontWeight: 700 }}>
                {health.charAt(0).toUpperCase() + health.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
