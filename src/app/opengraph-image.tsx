import { ImageResponse } from "next/og";
import { SITE_NAME, TAGLINE } from "@/lib/constants";
import { loadOgFonts } from "@/lib/og-fonts";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const fonts = await loadOgFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0f2744 0%, #1e3a5f 50%, #0f2744 100%)",
          position: "relative",
        }}
      >
        {/* Crimson accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 8,
            background: "#dc2626",
          }}
        />
        <div
          style={{
            fontFamily: "Cormorant Garamond",
            fontSize: 64,
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.1,
            marginBottom: 16,
          }}
        >
          {SITE_NAME}
        </div>
        <div
          style={{
            fontFamily: "DM Sans",
            fontSize: 28,
            fontWeight: 600,
            color: "#94a3b8",
            marginBottom: 40,
          }}
        >
          {TAGLINE}
        </div>
        <div
          style={{
            fontFamily: "DM Sans",
            fontSize: 18,
            fontWeight: 600,
            color: "#dc2626",
            letterSpacing: "0.15em",
            textTransform: "uppercase" as const,
          }}
        >
          Central Florida Real Estate
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: "normal" as const })),
    },
  );
}
