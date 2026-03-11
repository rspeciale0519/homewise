"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Lightbox } from "./lightbox";
import type { PhotoGalleryProps } from "./types";

const VISIBLE_COUNT = 5;

function MosaicTile({
  src,
  alt,
  className,
  sizes,
  priority = false,
  index,
  overlay,
  onClick,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes: string;
  priority?: boolean;
  index: number;
  overlay?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden cursor-zoom-in group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 focus-visible:ring-offset-2",
        className
      )}
      aria-label={alt}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        className="object-cover transition-transform duration-500 ease-out will-change-transform group-hover:scale-[1.04]"
        sizes={sizes}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      {overlay}
    </motion.button>
  );
}

function ViewAllOverlay({ remaining }: { remaining: number }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all duration-300 group-hover:bg-black/50">
      <div className="flex items-center gap-2 text-white">
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
          />
        </svg>
        <span className="text-sm font-semibold tracking-wide">
          View all {remaining} photos
        </span>
      </div>
    </div>
  );
}

function MobileGallery({
  photos,
  address,
  onOpen,
}: {
  photos: string[];
  address: string;
  onOpen: (index: number) => void;
}) {
  return (
    <div className="md:hidden space-y-3">
      <MosaicTile
        src={photos[0]!}
        alt={`${address} - Photo 1`}
        className="aspect-[16/9] w-full rounded-2xl"
        sizes="100vw"
        priority
        index={0}
        onClick={() => onOpen(0)}
      />
      {photos.length > 1 && (
        <button
          onClick={() => onOpen(0)}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-navy-700 text-white text-sm font-medium tracking-wide hover:bg-navy-800 transition-colors active:scale-[0.98]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
            />
          </svg>
          View all {photos.length} photos
        </button>
      )}
    </div>
  );
}

function DesktopMosaic({
  photos,
  address,
  onOpen,
}: {
  photos: string[];
  address: string;
  onOpen: (index: number) => void;
}) {
  const count = photos.length;
  const remaining = count;
  const heroSizes = "(max-width: 1024px) 60vw, 40vw";
  const thumbSizes = "(max-width: 1024px) 30vw, 20vw";

  if (count === 1) {
    return (
      <div className="hidden md:block">
        <MosaicTile
          src={photos[0]!}
          alt={`${address} - Photo 1`}
          className="aspect-[21/9] w-full rounded-2xl"
          sizes="100vw"
          priority
          index={0}
          onClick={() => onOpen(0)}
        />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="hidden md:grid grid-cols-2 gap-1 rounded-2xl overflow-hidden aspect-[21/9]">
        {photos.map((photo, i) => (
          <MosaicTile
            key={photo}
            src={photo}
            alt={`${address} - Photo ${i + 1}`}
            className="h-full w-full"
            sizes="50vw"
            priority={i === 0}
            index={i}
            onClick={() => onOpen(i)}
          />
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="hidden md:grid grid-cols-5 grid-rows-2 gap-1 rounded-2xl overflow-hidden aspect-[21/9]">
        <MosaicTile
          src={photos[0]!}
          alt={`${address} - Photo 1`}
          className="col-span-3 row-span-2"
          sizes={heroSizes}
          priority
          index={0}
          onClick={() => onOpen(0)}
        />
        <MosaicTile
          src={photos[1]!}
          alt={`${address} - Photo 2`}
          className="col-span-2 row-span-1"
          sizes={thumbSizes}
          index={1}
          onClick={() => onOpen(1)}
        />
        <MosaicTile
          src={photos[2]!}
          alt={`${address} - Photo 3`}
          className="col-span-2 row-span-1"
          sizes={thumbSizes}
          index={2}
          onClick={() => onOpen(2)}
        />
      </div>
    );
  }

  if (count === 4) {
    return (
      <div className="hidden md:grid grid-cols-4 grid-rows-3 gap-1 rounded-2xl overflow-hidden aspect-[21/9]">
        <MosaicTile
          src={photos[0]!}
          alt={`${address} - Photo 1`}
          className="col-span-2 row-span-3"
          sizes={heroSizes}
          priority
          index={0}
          onClick={() => onOpen(0)}
        />
        {photos.slice(1).map((photo, i) => (
          <MosaicTile
            key={photo}
            src={photo}
            alt={`${address} - Photo ${i + 2}`}
            className="col-span-2 row-span-1"
            sizes={thumbSizes}
            index={i + 1}
            onClick={() => onOpen(i + 1)}
          />
        ))}
      </div>
    );
  }

  // 5+ photos: hero + 2x2 grid with "view all" overlay on last cell
  const visible = photos.slice(0, VISIBLE_COUNT);
  return (
    <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-1 rounded-2xl overflow-hidden aspect-[21/9]">
      <MosaicTile
        src={visible[0]!}
        alt={`${address} - Photo 1`}
        className="col-span-2 row-span-2"
        sizes={heroSizes}
        priority
        index={0}
        onClick={() => onOpen(0)}
      />
      <MosaicTile
        src={visible[1]!}
        alt={`${address} - Photo 2`}
        className="col-span-1 row-span-1"
        sizes={thumbSizes}
        index={1}
        onClick={() => onOpen(1)}
      />
      <MosaicTile
        src={visible[2]!}
        alt={`${address} - Photo 3`}
        className="col-span-1 row-span-1"
        sizes={thumbSizes}
        index={2}
        onClick={() => onOpen(2)}
      />
      <MosaicTile
        src={visible[3]!}
        alt={`${address} - Photo 4`}
        className="col-span-1 row-span-1"
        sizes={thumbSizes}
        index={3}
        onClick={() => onOpen(3)}
      />
      <MosaicTile
        src={visible[4]!}
        alt={`View all ${remaining} photos of ${address}`}
        className="col-span-1 row-span-1"
        sizes={thumbSizes}
        index={4}
        overlay={<ViewAllOverlay remaining={remaining} />}
        onClick={() => onOpen(0)}
      />
    </div>
  );
}

export function PhotoGallery({ photos, address }: PhotoGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;
    if (lightboxOpen) {
      header.style.visibility = "hidden";
    } else {
      header.style.visibility = "";
    }
    return () => { header.style.visibility = ""; };
  }, [lightboxOpen]);

  if (photos.length === 0) return null;

  const openLightbox = (index: number) => {
    setStartIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <MobileGallery photos={photos} address={address} onOpen={openLightbox} />
      <DesktopMosaic photos={photos} address={address} onOpen={openLightbox} />
      <Lightbox
        photos={photos}
        address={address}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        startIndex={startIndex}
      />
    </>
  );
}
