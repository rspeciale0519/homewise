import { ImageResponse } from "next/og";
import { propertyProvider } from "@/providers";
import { formatPrice } from "@/lib/format";
import { SITE_NAME } from "@/lib/constants";
import { loadOgFonts } from "@/lib/og-fonts";

export const alt = "Property listing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function PropertyOgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await propertyProvider.getProperty(id);
  const fonts = await loadOgFonts();

  if (!property) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1e3a5f", color: "#fff", fontSize: 48, fontFamily: "DM Sans" }}>
          Property Not Found
        </div>
      ),
      { ...size, fonts: fonts.map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: "normal" as const })) },
    );
  }

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "60px 80px", background: "linear-gradient(135deg, #0f2744 0%, #1e3a5f 50%, #0f2744 100%)", position: "relative" }}>
        {/* Crimson accent bar */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 8, background: "#dc2626" }} />
        {/* Price */}
        <div style={{ fontFamily: "Cormorant Garamond", fontSize: 72, fontWeight: 700, color: "#ffffff", lineHeight: 1, marginBottom: 12 }}>
          {formatPrice(property.price)}
        </div>
        {/* Address */}
        <div style={{ fontFamily: "DM Sans", fontSize: 30, fontWeight: 600, color: "#cbd5e1", marginBottom: 32 }}>
          {property.address}, {property.city}, {property.state} {property.zip}
        </div>
        {/* Stats row */}
        <div style={{ display: "flex", gap: 40 }}>
          <Stat label="Beds" value={String(property.beds)} />
          <Stat label="Baths" value={String(property.baths)} />
          <Stat label="Sq Ft" value={property.sqft.toLocaleString()} />
        </div>
        {/* Branding */}
        <div style={{ position: "absolute", top: 48, right: 80, fontFamily: "DM Sans", fontSize: 16, fontWeight: 600, color: "#dc2626", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
          {SITE_NAME}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: "normal" as const })),
    },
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ fontFamily: "Cormorant Garamond", fontSize: 40, fontWeight: 700, color: "#ffffff" }}>{value}</div>
      <div style={{ fontFamily: "DM Sans", fontSize: 14, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>{label}</div>
    </div>
  );
}
