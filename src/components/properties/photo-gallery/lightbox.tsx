"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { useZoom } from "./use-zoom";
import { useImageColor } from "./use-image-color";
import type { LightboxProps } from "./types";

const SWIPE_CLOSE_THRESHOLD = 120;
const SWIPE_VELOCITY_THRESHOLD = 400;

const CROSSFADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
};

function ZoomableSlide({
  src,
  alt,
  onSwipeClose,
  isFullscreen,
}: {
  src: string;
  alt: string;
  onSwipeClose: () => void;
  isFullscreen: boolean;
}) {
  const { containerRef, style: zoomStyle, getIsZoomed, resetZoom } = useZoom();
  const ambientColor = useImageColor(src);
  const [zoomed, setZoomed] = useState(false);
  const dragY = useMotionValue(0);
  const backdropOpacity = useTransform(dragY, [-200, 0, 200], [0.3, 1, 0.3]);
  const imageScale = useTransform(dragY, [-200, 0, 200], [0.92, 1, 0.92]);

  useEffect(() => {
    resetZoom();
  }, [src, resetZoom]);

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
    <motion.div
      key={src}
      initial={CROSSFADE.initial}
      animate={CROSSFADE.animate}
      exit={CROSSFADE.exit}
      transition={CROSSFADE.transition}
      className={cn(
        "absolute inset-0 flex items-center justify-center",
        isFullscreen ? "p-0" : "px-4 sm:px-8"
      )}
    >
      {!isFullscreen && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
          <div
            className="w-[60%] h-[50%] rounded-full blur-3xl transition-colors duration-1000"
            style={{ backgroundColor: ambientColor }}
          />
        </div>
      )}

      <motion.div
        style={isFullscreen ? undefined : { y: zoomed ? 0 : dragY, scale: zoomed ? 1 : imageScale, opacity: zoomed ? 1 : backdropOpacity }}
        drag={isFullscreen || zoomed ? false : "y"}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.6}
        onDragEnd={isFullscreen || zoomed ? undefined : handleDragEnd}
        className={cn(
          "relative select-none touch-none",
          isFullscreen ? "w-full h-full" : "w-full max-w-6xl aspect-[16/10]"
        )}
      >
        <div ref={containerRef} style={isFullscreen ? undefined : zoomStyle} className="relative w-full h-full">
          <Image
            src={src}
            alt={alt}
            fill
            className="object-contain pointer-events-none"
            sizes="100vw"
            draggable={false}
            style={isFullscreen ? undefined : {
              filter: [
                "drop-shadow(0 0 2px rgba(255,255,255,0.9))",
                "drop-shadow(0 0 6px rgba(255,255,255,0.4))",
                "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
                "drop-shadow(0 12px 32px rgba(0,0,0,0.35))",
                "drop-shadow(0 28px 80px rgba(0,0,0,0.25))",
              ].join(" "),
            }}
          />
        </div>
      </motion.div>
    </motion.div>
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
      <div ref={thumbRef} className="overflow-hidden rounded-xl">
        <div className="flex gap-1.5">
          {photos.map((photo, i) => {
            const isActive = i === activeIndex;
            return (
              <button
                key={`thumb-${i}`}
                onClick={() => onSelect(i)}
                className={cn(
                  "relative flex-[0_0_72px] h-[50px] rounded-lg overflow-hidden transition-all duration-500 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
                  isActive
                    ? "ring-2 ring-white/90 opacity-100 scale-110 z-10"
                    : "opacity-30 hover:opacity-65 hover:scale-105"
                )}
                aria-label={`Go to photo ${i + 1} of ${photos.length}`}
                aria-current={isActive ? "true" : undefined}
              >
                <Image
                  src={photo}
                  alt={`${address} thumbnail ${i + 1}`}
                  fill
                  className={cn(
                    "object-cover transition-all duration-500",
                    isActive ? "brightness-110 saturate-110" : "brightness-75"
                  )}
                  sizes="72px"
                />
                {isActive && (
                  <motion.div
                    layoutId="thumb-highlight"
                    className="absolute inset-0 rounded-lg ring-2 ring-white/90 shadow-[0_0_16px_rgba(255,255,255,0.2)]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Lightbox({ photos, address, open, onOpenChange, startIndex }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setCurrentIndex(startIndex); // eslint-disable-line react-hooks/set-state-in-effect -- reset index when lightbox opens at a new position
  }, [open, startIndex]);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  useEffect(() => {
    if (!open && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, [open]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      contentRef.current?.requestFullscreen().catch(() => {});
    }
  }, []);

  const goTo = useCallback((index: number) => {
    const wrapped = ((index % photos.length) + photos.length) % photos.length;
    setCurrentIndex(wrapped);
  }, [photos.length]);

  const scrollPrev = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex]);
  const scrollNext = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); scrollPrev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); scrollNext(); }
      if (e.key === "Home") { e.preventDefault(); goTo(0); }
      if (e.key === "End") { e.preventDefault(); goTo(photos.length - 1); }
      if (e.key === "f" || e.key === "F") { e.preventDefault(); toggleFullscreen(); }
    },
    [scrollPrev, scrollNext, goTo, photos.length, toggleFullscreen]
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
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md"
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              onKeyDown={handleKeyDown}
              aria-describedby={undefined}
            >
              <motion.div
                ref={contentRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className={cn("fixed inset-0 z-[101] flex flex-col outline-none", isFullscreen && "bg-black")}
              >
                <Dialog.Title className="sr-only">
                  {address} — photo gallery
                </Dialog.Title>

                {/* Top bar — hidden in fullscreen */}
                {!isFullscreen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-8"
                  >
                    <div
                      className="text-white/50 text-sm font-medium tabular-nums tracking-wider"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      <span className="text-white font-semibold">{currentIndex + 1}</span>
                      <span className="mx-1.5 text-white/30">/</span>
                      <span>{photos.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleFullscreen}
                        className="h-10 w-10 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/15 text-white/60 hover:text-white transition-all duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 backdrop-blur-sm"
                        aria-label="Enter fullscreen"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                        </svg>
                      </button>
                      <Dialog.Close asChild>
                        <button
                          className="h-10 w-10 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/15 text-white/60 hover:text-white transition-all duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 backdrop-blur-sm"
                          aria-label="Close photo gallery"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </Dialog.Close>
                    </div>
                  </motion.div>
                )}

                {/* Progress bar — hidden in fullscreen */}
                {!isFullscreen && (
                  <div className="h-px bg-white/[0.06] mx-5 sm:mx-8">
                    <motion.div
                      className="h-full bg-gradient-to-r from-white/30 via-white/50 to-white/30 rounded-full"
                      initial={false}
                      animate={{ width: `${progressWidth}%` }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                )}

                {/* Main photo area */}
                <div className="flex-1 relative min-h-0">
                  {/* Fullscreen overlay controls */}
                  {isFullscreen && (
                    <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                      <div className="text-white/50 text-sm font-medium tabular-nums tracking-wider mr-2">
                        <span className="text-white font-semibold">{currentIndex + 1}</span>
                        <span className="mx-1.5 text-white/30">/</span>
                        <span>{photos.length}</span>
                      </div>
                      <button
                        onClick={toggleFullscreen}
                        className="h-10 w-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white/70 hover:text-white transition-all duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 backdrop-blur-sm"
                        aria-label="Exit fullscreen"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={scrollPrev}
                        className={cn(
                          "hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 backdrop-blur-md",
                          isFullscreen
                            ? "h-14 w-14 bg-black/40 hover:bg-black/60 text-white/70 hover:text-white"
                            : "h-11 w-11 bg-white/[0.05] hover:bg-white/[0.12] text-white/50 hover:text-white/90 border border-white/[0.06]"
                        )}
                        aria-label="Previous photo"
                      >
                        <svg className={cn(isFullscreen ? "h-6 w-6" : "h-5 w-5")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={scrollNext}
                        className={cn(
                          "hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 backdrop-blur-md",
                          isFullscreen
                            ? "h-14 w-14 bg-black/40 hover:bg-black/60 text-white/70 hover:text-white"
                            : "h-11 w-11 bg-white/[0.05] hover:bg-white/[0.12] text-white/50 hover:text-white/90 border border-white/[0.06]"
                        )}
                        aria-label="Next photo"
                      >
                        <svg className={cn(isFullscreen ? "h-6 w-6" : "h-5 w-5")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}

                  <AnimatePresence>
                    <ZoomableSlide
                      key={`slide-${currentIndex}`}
                      src={photos[currentIndex]!}
                      alt={`${address} - Photo ${currentIndex + 1} of ${photos.length}`}
                      onSwipeClose={handleSwipeClose}
                      isFullscreen={isFullscreen}
                    />
                  </AnimatePresence>

                  {/* Cinematic vignette — hidden in fullscreen */}
                  {!isFullscreen && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      aria-hidden="true"
                      style={{ background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.3) 100%)" }}
                    />
                  )}
                </div>

                {/* Thumbnail strip — hidden in fullscreen */}
                {!isFullscreen && photos.length > 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="py-4"
                  >
                    <ThumbnailStrip
                      photos={photos}
                      address={address}
                      activeIndex={currentIndex}
                      onSelect={goTo}
                    />
                  </motion.div>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </AnimatePresence>
  );
}

