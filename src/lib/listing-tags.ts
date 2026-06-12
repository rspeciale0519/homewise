export type TaggableListing = {
  hasPool?: boolean;
  hasWaterfront?: boolean;
  isNewConstruction?: boolean;
  hasGatedCommunity?: boolean;
  yearBuilt?: number | null;
  communityFeatures?: string[];
  propertyType?: string;
};

export function deriveListingTags(listing: TaggableListing): string[] {
  const tags = new Set<string>();
  const features = (listing.communityFeatures ?? []).map((f) => f.toLowerCase());

  if (listing.hasPool) tags.add("pool");
  if (listing.hasWaterfront) tags.add("waterfront");
  if (listing.isNewConstruction) tags.add("new-construction");
  if (listing.hasGatedCommunity) tags.add("gated");
  if (features.some((f) => f.includes("golf"))) tags.add("golf");
  if (features.some((f) => f.includes("senior") || f.includes("55"))) tags.add("55-plus");
  if (features.some((f) => f.includes("water access") || f.includes("dock") || f.includes("boat"))) {
    tags.add("boating");
  }
  if (listing.propertyType?.toLowerCase() === "land") tags.add("land");

  if (listing.yearBuilt != null) {
    if (listing.yearBuilt >= 2020) tags.add("newer-build");
    else if (listing.yearBuilt < 1980) tags.add("established");
  }

  return [...tags].sort();
}

/**
 * Optional AI styling-tag pass. Hard-gated on OPENAI_API_KEY so syncs without
 * the key never touch the network.
 */
export async function aiStyleTags(input: {
  description?: string | null;
  propertyType?: string;
}): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY) return [];
  if (!input.description) return [];

  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 40,
    messages: [
      {
        role: "user",
        content: `Return up to 3 comma-separated single-word style tags (e.g. modern, craftsman, farmhouse, mediterranean, renovated) for this ${input.propertyType ?? "home"}: ${input.description.slice(0, 400)}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";
  return text
    .split(",")
    .map((tag) => tag.trim().toLowerCase().replace(/[^a-z0-9-]/g, ""))
    .filter((tag) => tag.length > 1 && tag.length < 25)
    .slice(0, 3);
}
