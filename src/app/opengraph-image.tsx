import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "GRID — A Last.fm album grid generator";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: "#0a0a0a",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <img
          style={{
            width: 128,
            height: 128,
          }}
          alt="grid logo"
          src="https://grid.dylanbrown.xyz/img/logo.png"
        />
        <span
          style={{
            fontSize: 96,
            fontWeight: 800,
            color: "#fafafa",
            letterSpacing: "-4px",
            lineHeight: 1,
            fontFamily: "ui-monospace, monospace",
          }}
        >
          GRID
        </span>
      </div>
      <span
        style={{
          fontSize: 28,
          color: "#737373",
          letterSpacing: "2px",
        }}
      >
        Last.fm album grid generator
      </span>
    </div>,
    { ...size },
  );
}
