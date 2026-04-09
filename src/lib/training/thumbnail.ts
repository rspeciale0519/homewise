import { getYouTubeThumbnailUrl } from "./youtube";

interface ThumbnailInput {
  type: string;
  thumbnailUrl: string | null;
  url: string | null;
  body: string | null;
}

export interface ResolvedThumbnail {
  src: string | null;
  type: "custom" | "youtube" | "fallback";
}

export function resolveThumbnail(item: ThumbnailInput): ResolvedThumbnail {
  if (item.thumbnailUrl) {
    return { src: item.thumbnailUrl, type: "custom" };
  }

  if (item.type === "video" && item.url) {
    const ytThumb = getYouTubeThumbnailUrl(item.url);
    if (ytThumb) return { src: ytThumb, type: "youtube" };
  }

  return { src: null, type: "fallback" };
}

export function getArticlePreviewText(body: string | null, maxLength = 120): string {
  if (!body) return "";
  const stripped = body.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  if (stripped.length <= maxLength) return stripped;
  return stripped.slice(0, maxLength).replace(/\s\S*$/, "") + "...";
}
