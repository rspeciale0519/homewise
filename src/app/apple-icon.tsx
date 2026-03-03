import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1e3a5f",
          borderRadius: 36,
        }}
      >
        <span
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: -2,
          }}
        >
          HW
        </span>
      </div>
    ),
    { ...size },
  );
}
