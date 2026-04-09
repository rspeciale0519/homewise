"use client";

import Image from "next/image";
import { resolveThumbnail, getArticlePreviewText } from "@/lib/training/thumbnail";

interface ModuleThumbnailProps {
  type: string;
  thumbnailUrl: string | null;
  url: string | null;
  body: string | null;
  title: string;
  duration: number | null;
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  video: { bg: "bg-red-600/90", text: "text-white" },
  document: { bg: "bg-blue-600/90", text: "text-white" },
  article: { bg: "bg-green-700/90", text: "text-white" },
  quiz: { bg: "bg-purple-600/90", text: "text-white" },
};

export function ModuleThumbnail({ type, thumbnailUrl, url, body, title, duration }: ModuleThumbnailProps) {
  const resolved = resolveThumbnail({ type, thumbnailUrl, url, body });
  const colors = TYPE_COLORS[type] ?? { bg: "bg-red-600/90", text: "text-white" };
  const typeLabel = type === "document" ? "PDF" : type.toUpperCase();

  if (resolved.src) {
    return (
      <div className="relative aspect-video rounded-md overflow-hidden bg-slate-900">
        <Image src={resolved.src} alt={title} fill className="object-cover" sizes="(max-width: 640px) 50vw, 200px" />
        <TypeBadge label={typeLabel} colors={colors} />
        {type === "video" && <PlayOverlay />}
        {duration != null && type === "video" && <DurationBadge duration={duration} />}
      </div>
    );
  }

  if (type === "article") {
    const preview = getArticlePreviewText(body);
    return (
      <div className="relative aspect-video rounded-md overflow-hidden bg-gradient-to-br from-green-50 to-green-100 p-3">
        <div className="text-[10px] leading-relaxed text-slate-600 opacity-70 overflow-hidden h-full">
          <p className="font-bold text-[11px] text-slate-800 mb-1">{title}</p>
          {preview}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-green-100" />
        <TypeBadge label={typeLabel} colors={colors} position="top-right" />
      </div>
    );
  }

  if (type === "quiz") {
    return (
      <div className="relative aspect-video rounded-md overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center">
        <span className="text-2xl">📝</span>
        <TypeBadge label={typeLabel} colors={colors} />
      </div>
    );
  }

  // Document fallback (PDF without generated thumbnail)
  return (
    <div className="relative aspect-video rounded-md overflow-hidden bg-slate-100 flex items-center justify-center">
      <div className="w-12 h-14 bg-white border border-slate-200 rounded shadow-sm flex items-center justify-center">
        <span className="text-[10px] font-bold text-blue-600">PDF</span>
      </div>
      <TypeBadge label={typeLabel} colors={colors} />
    </div>
  );
}

function TypeBadge({ label, colors, position = "top-left" }: { label: string; colors: { bg: string; text: string }; position?: "top-left" | "top-right" }) {
  const pos = position === "top-right" ? "top-1 right-1" : "top-1 left-1";
  return (
    <span className={`absolute ${pos} ${colors.bg} ${colors.text} text-[7px] font-bold px-1.5 py-px rounded`}>
      {label}
    </span>
  );
}

function PlayOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-8 h-8 bg-red-600/90 rounded-full flex items-center justify-center">
        <svg className="w-3.5 h-3.5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  );
}

function DurationBadge({ duration }: { duration: number }) {
  const mins = Math.floor(duration);
  const secs = Math.round((duration % 1) * 60);
  const label = secs > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${mins}:00`;
  return (
    <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[8px] px-1.5 py-px rounded">
      {label}
    </span>
  );
}
