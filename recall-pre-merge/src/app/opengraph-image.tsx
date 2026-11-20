import { ImageResponse } from "next/og";

export const alt = "Recall. Stop flipping cards. Start remembering.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#F3EEE4",
          color: "#1B1916",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#3C3489",
              color: "#FFFCF7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            R
          </div>
          <div style={{ display: "flex", fontSize: 28, letterSpacing: 3, color: "#3C3489" }}>RECALL</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 76, lineHeight: 1.02, letterSpacing: -2, maxWidth: 980 }}>
          <div style={{ display: "flex" }}>Stop flipping cards.</div>
          <div style={{ display: "flex", fontStyle: "italic", color: "#3C3489" }}>Start remembering.</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
