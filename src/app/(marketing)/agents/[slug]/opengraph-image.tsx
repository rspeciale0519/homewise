import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { SITE_NAME } from "@/lib/constants";
import { loadOgFonts } from "@/lib/og-fonts";

export const alt = "Agent profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function AgentOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agent = await prisma.agent.findFirst({
    where: { slug, active: true },
    select: { firstName: true, lastName: true, designations: true, photoUrl: true },
  });
  const fonts = await loadOgFonts();

  if (!agent) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1e3a5f", color: "#fff", fontSize: 48, fontFamily: "DM Sans" }}>
          Agent Not Found
        </div>
      ),
      { ...size, fonts: fonts.map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: "normal" as const })) },
    );
  }

  const fullName = `${agent.firstName} ${agent.lastName}`;
  const initials = `${agent.firstName.charAt(0)}${agent.lastName.charAt(0)}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", padding: "60px 80px", background: "linear-gradient(135deg, #0f2744 0%, #1e3a5f 50%, #0f2744 100%)", position: "relative" }}>
        {/* Crimson accent bar */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 8, background: "#dc2626" }} />
        {/* Avatar or initials */}
        <div style={{ width: 200, height: 200, borderRadius: 24, overflow: "hidden", marginRight: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #1e3a5f, #2d4a6f)", border: "3px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
          {agent.photoUrl ? (
            <img src={agent.photoUrl} alt="" width={200} height={200} style={{ objectFit: "cover" }} />
          ) : (
            <div style={{ fontFamily: "Cormorant Garamond", fontSize: 80, fontWeight: 700, color: "rgba(255,255,255,0.2)" }}>{initials}</div>
          )}
        </div>
        {/* Info */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "DM Sans", fontSize: 16, fontWeight: 600, color: "#dc2626", letterSpacing: "0.15em", textTransform: "uppercase" as const, marginBottom: 8 }}>
            Licensed Real Estate Agent
          </div>
          <div style={{ fontFamily: "Cormorant Garamond", fontSize: 56, fontWeight: 700, color: "#ffffff", lineHeight: 1.1, marginBottom: 16 }}>
            {fullName}
          </div>
          {agent.designations.length > 0 && (
            <div style={{ display: "flex", gap: 12 }}>
              {agent.designations.slice(0, 4).map((d) => (
                <div key={d} style={{ fontFamily: "DM Sans", fontSize: 14, fontWeight: 600, color: "#94a3b8", padding: "6px 16px", border: "1px solid rgba(148,163,184,0.3)", borderRadius: 8 }}>
                  {d}
                </div>
              ))}
            </div>
          )}
          <div style={{ fontFamily: "DM Sans", fontSize: 16, fontWeight: 600, color: "#64748b", marginTop: 24 }}>
            {SITE_NAME}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: "normal" as const })),
    },
  );
}
