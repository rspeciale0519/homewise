const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  /^([a-zA-Z0-9_-]{11})$/,
];

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function getYouTubeThumbnailUrl(
  videoIdOrUrl: string,
  quality: "default" | "mqdefault" | "hqdefault" | "sddefault" | "maxresdefault" = "hqdefault",
): string | null {
  const id = extractYouTubeId(videoIdOrUrl) ?? videoIdOrUrl;
  if (!id || id.length !== 11) return null;
  return `https://img.youtube.com/vi/${id}/${quality}.jpg`;
}

export function getYouTubeEmbedUrl(videoIdOrUrl: string): string | null {
  const id = extractYouTubeId(videoIdOrUrl);
  if (!id) return null;
  return `https://www.youtube.com/embed/${id}`;
}
