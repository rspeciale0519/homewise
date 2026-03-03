"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface PhotoGalleryProps {
  photos: string[];
  address: string;
}

export function PhotoGallery({ photos, address }: PhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (photos.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-slate-100">
        <Image
          src={photos[activeIndex] ?? photos[0]!}
          alt={`${address} - Photo ${activeIndex + 1}`}
          fill
          priority={activeIndex === 0}
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 66vw"
        />
        {photos.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
            {activeIndex + 1} / {photos.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, i) => (
            <button
              key={photo}
              onClick={() => setActiveIndex(i)}
              className={cn(
                "relative h-16 w-24 rounded-lg overflow-hidden shrink-0 border-2 transition-colors",
                i === activeIndex ? "border-navy-600" : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              <Image src={photo} alt={`Thumbnail ${i + 1}`} fill className="object-cover" sizes="96px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
