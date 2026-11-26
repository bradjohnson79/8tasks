import { ImageResponse } from "next/og";

export const alt = "8Tasks: Small Missions. Real Money. Always Free. For Everyone.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Static share image in the approved palette (rendered once at build time). */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        background: "#131B2B",
        color: "#F1F5F9",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", fontSize: 120, fontWeight: 800 }}>
        <span style={{ color: "#53E6A0" }}>8</span>
        <span>Tasks</span>
        <span style={{ fontSize: 48, color: "#9DAABD", marginLeft: 6 }}>.com</span>
      </div>
      <div style={{ marginTop: 24, fontSize: 56, fontWeight: 700, color: "#53E6A0" }}>
        Small Missions. Real Money.
      </div>
      <div style={{ marginTop: 16, fontSize: 36, color: "#9DAABD" }}>
        Always Free. For Everyone.
      </div>
      <div
        style={{
          marginTop: 48,
          display: "flex",
          padding: "14px 28px",
          borderRadius: 18,
          background: "#294D40",
          color: "#83EFBA",
          fontSize: 30,
          fontWeight: 600,
          alignSelf: "flex-start",
        }}
      >
        Discover legitimate ways to earn in Canada and the US
      </div>
    </div>,
    size,
  );
}
