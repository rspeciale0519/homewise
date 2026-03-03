import { prisma } from "@/lib/prisma";

const API_KEY = process.env.GREATSCHOOLS_API_KEY ?? "";
const BASE_URL = "https://gs-api.greatschools.org/nearby-schools";

export interface SchoolInfo {
  name: string;
  type: "elementary" | "middle" | "high";
  rating: number | null;
  distance: number;
  enrollment: number | null;
}

export async function getNearbySchools(lat: number, lng: number): Promise<SchoolInfo[] | null> {
  if (!API_KEY) return null;

  const latLngKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;

  const cached = await prisma.schoolCache.findUnique({ where: { latLngKey } });
  if (cached && cached.expiresAt > new Date()) {
    return cached.schools as unknown as SchoolInfo[];
  }

  try {
    const url = new URL(BASE_URL);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("radius", "5");
    url.searchParams.set("limit", "10");

    const res = await fetch(url.toString(), {
      headers: { "x-api-key": API_KEY },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      schools?: Array<{
        name: string;
        schoolType: string;
        rating: number | null;
        distance: number;
        enrollment: number | null;
      }>;
    };

    const schools: SchoolInfo[] = (data.schools ?? []).map((s) => ({
      name: s.name,
      type: mapSchoolType(s.schoolType),
      rating: s.rating,
      distance: s.distance,
      enrollment: s.enrollment,
    }));

    const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.schoolCache.upsert({
      where: { latLngKey },
      update: {
        schools: schools as object,
        fetchedAt: new Date(),
        expiresAt: sevenDays,
      },
      create: {
        latLngKey,
        schools: schools as object,
        expiresAt: sevenDays,
      },
    });

    return schools;
  } catch {
    return null;
  }
}

function mapSchoolType(type: string): "elementary" | "middle" | "high" {
  const lower = type.toLowerCase();
  if (lower.includes("middle") || lower.includes("junior")) return "middle";
  if (lower.includes("high") || lower.includes("senior")) return "high";
  return "elementary";
}
