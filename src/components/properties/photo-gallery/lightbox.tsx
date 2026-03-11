"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { useZoom } from "./use-zoom";
import type { LightboxProps } from "./types";

const SWIPE_CLOSE_THRESHOLD = 120;
const SWIPE_VELOCITY_THRESHOLD = 400;

function ZoomableSlide({
  src,
  alt,
  isActive,
  onSwipeClose,
}: {
  src: string;
  alt: string;
  isActive: boolean;
  onSwipeClose: () => void;
}) {
  const { containerRef, style: zoomStyle, getIsZoomed, resetZoom } = useZoom();
  const [zoomed, setZoomed] = useState(false);
  const dragY = useMotionValue(0);
  const backdropOpacity = useTransform(dragY, [-200, 0, 200], [0.3, 1, 0.3]);
  const imageScale = useTransform(dragY, [-200, 0, 200], [0.92, 1, 0.92]);

  useEffect(() => {
    if (!isActive) resetZoom();
  }, [isActive, resetZoom]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new MutationObserver(() => {
      setZoomed(getIsZoomed());
    });
    observer.observe(el, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, [containerRef, getIsZoomed]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (
      Math.abs(info.offset.y) > SWIPE_CLOSE_THRESHOLD ||
      Math.abs(info.velocity.y) > SWIPE_VELOCITY_THRESHOLD
    ) {
      onSwipeClose();
    }
  };

  return (
    <div className="flex-[0_0_100%] min-w-0 flex items-center justify-center h-full px-4">
      <motion.div
        style={{ y: zoomed ? 0 : dragY, scale: zoomed ? 1 : imageScale, opacity: zoomed ? 1 : backdropOpacity }}
        drag={zoomed ? false : "y"}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.6}
        onDragEnd={zoomed ? undefined : handleDragEnd}
        className="relative w-full max-w-6xl aspect-[16/10] select-none touch-none"
      >
        <div ref={containerRef} style={zoomStyle} className="relative w-full h-full">
          <Image
            src={src}
            alt={alt}
            fill
            className="object-contain pointer-events-none"
            sizes="100vw"
            draggable={false}
          />
        </div>
      </motion.div>
    </div>
  );
}

function ThumbnailStrip({
  photos,
  address,
  activeIndex,
  onSelect,
}: {
  photos: string[];
  address: string;
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  const [thumbRef, thumbApi] = useEmblaCarousel({
    containScroll: "keepSnaps",
    dragFree: true,
    align: "center",
  });

  useEffect(() => {
    if (thumbApi) thumbApi.scrollTo(activeIndex);
  }, [thumbApi, activeIndex]);

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <div ref={thumbRef} className="overflow-hidden">
        <div className="flex gap-2">
          {photos.map((photo, i) => (
            <button
              key={`thumb-${i}`}
              onClick={() => onSelect(i)}
              className={cn(
                "relative flex-[0_0_72px] h-[48px] rounded-lg overflow-hidden transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                i === activeIndex
                  ? "ring-2 ring-white opacity-100 scale-105"
                  : "opacity-40 hover:opacity-70"
              )}
              aria-label={`Go to photo ${i + 1} of ${photos.length}`}
              aria-current={i === activeIndex ? "true" : undefined}
            >
              <Image
                src={photo}
                alt={`${address} thumbnail ${i + 1}`}
                fill
                className="object-cover"
                sizes="72px"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Lightbox({ photos, address, open, onOpenChange, startIndex }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [mainRef, mainApi] = useEmblaCarousel({ loop: true, startIndex });

  useEffect(() => {
    if (open && mainApi) {
      mainApi.scrollTo(startIndex, true);
    }
  }, [open, mainApi, startIndex]);

  useEffect(() => {
    if (!mainApi) return;
    const onSelect = () => setCurrentIndex(mainApi.selectedScrollSnap());
    mainApi.on("select", onSelect);
    return () => { mainApi.off("select", onSelect); };
  }, [mainApi]);

  const scrollPrev = useCallback(() => mainApi?.scrollPrev(), [mainApi]);
  const scrollNext = useCallback(() => mainApi?.scrollNext(), [mainApi]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); scrollPrev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); scrollNext(); }
      if (e.key === "Home") { e.preventDefault(); mainApi?.scrollTo(0); }
      if (e.key === "End") { e.preventDefault(); mainApi?.scrollTo(photos.length - 1); }
    },
    [scrollPrev, scrollNext, mainApi, photos.length]
  );

  const handleThumbSelect = useCallback(
    (index: number) => mainApi?.scrollTo(index),
    [mainApi]
  );

  const handleSwipeClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  const progressWidth = photos.length > 1 ? ((currentIndex + 1) / photos.length) * 100 : 100;

  return (
    <AnimatePresence>
      {open && (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-0 z-[100] bg-black/80"
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              onKeyDown={handleKeyDown}
              aria-describedby={undefined}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-0 z-[101] flex flex-col outline-none"
              >
                <Dialog.Title className="sr-only">
                  {address} — photo gallery
                </Dialog.Title>

                {/* Top bar */}
                <div className="relative z-10 flex items-center justify-between px-4 py-3 sm:px-6">
                  <div
                    className="text-white/70 text-sm font-medium tabular-nums"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    <span className="text-white">{currentIndex + 1}</span>
                    {" / "}
                    {photos.length}
                  </div>
                  <Dialog.Close asChild>
                    <button
                      className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      aria-label="Close photo gallery"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </Dialog.Close>
                </div>

                {/* Progress bar */}
                <div className="h-[3px] bg-white/10 mx-4 sm:mx-6 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-white/50 rounded-full"
                    initial={false}
                    animate={{ width: `${progressWidth}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                </div>

                {/* Main carousel area */}
                <div className="flex-1 relative flex items-center min-h-0">
                  {/* Navigation arrows (desktop) */}
                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={scrollPrev}
                        className="hidden sm:flex absolute left-3 z-10 h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        aria-label="Previous photo"
                      >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={scrollNext}
                        className="hidden sm:flex absolute right-3 z-10 h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        aria-label="Next photo"
                      >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}

                  <div ref={mainRef} className="overflow-hidden w-full h-full">
                    <div className="flex h-full">
                      {photos.map((photo, i) => (
                        <ZoomableSlide
                          key={`slide-${i}`}
                          src={photo}
                          alt={`${address} - Photo ${i + 1} of ${photos.length}`}
                          isActive={i === currentIndex}
                          onSwipeClose={handleSwipeClose}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Thumbnail strip */}
                {photos.length > 1 && (
                  <div className="py-3">
                    <ThumbnailStrip
                      photos={photos}
                      address={address}
                      activeIndex={currentIndex}
                      onSelect={handleThumbSelect}
                    />
                  </div>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </AnimatePresence>
  );
}
