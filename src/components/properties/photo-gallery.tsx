"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

interface PhotoGalleryProps {
  photos: string[];
  address: string;
}

export function PhotoGallery({ photos, address }: PhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxStartIndex, setLightboxStartIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxEmblaRef, lightboxEmblaApi] = useEmblaCarousel({ loop: true });

  const scrollPrev = useCallback(() => lightboxEmblaApi?.scrollPrev(), [lightboxEmblaApi]);
  const scrollNext = useCallback(() => lightboxEmblaApi?.scrollNext(), [lightboxEmblaApi]);

  useEffect(() => {
    if (lightboxOpen && lightboxEmblaApi) {
      lightboxEmblaApi.scrollTo(lightboxStartIndex, true);
    }
  }, [lightboxOpen, lightboxEmblaApi, lightboxStartIndex]);

  useEffect(() => {
    if (!lightboxEmblaApi) return;
    const onSelect = () => setLightboxIndex(lightboxEmblaApi.selectedScrollSnap());
    lightboxEmblaApi.on("select", onSelect);
    return () => { lightboxEmblaApi.off("select", onSelect); };
  }, [lightboxEmblaApi]);

  const openLightbox = (index: number) => {
    setLightboxStartIndex(index);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  if (photos.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Main image */}
      <button
        onClick={() => openLightbox(activeIndex)}
        className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-slate-100 w-full cursor-zoom-in group"
      >
        <Image
          src={photos[activeIndex] ?? photos[0]!}
          alt={`${address} - Photo ${activeIndex + 1}`}
          fill
          priority={activeIndex === 0}
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 66vw"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm rounded-full p-3">
            <svg className="h-6 w-6 text-navy-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
            </svg>
          </div>
        </div>
        {photos.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
            {activeIndex + 1} / {photos.length}
          </div>
        )}
      </button>

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

      {/* Lightbox */}
      <Dialog.Root open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-300" />
          <Dialog.Content
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 outline-none"
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") scrollPrev();
              if (e.key === "ArrowRight") scrollNext();
            }}
          >
            <Dialog.Title className="sr-only">{address} — photo gallery</Dialog.Title>

            {/* Close button */}
            <Dialog.Close asChild>
              <button
                className="absolute top-4 right-4 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Close lightbox"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </Dialog.Close>

            {/* Photo counter */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-white/80 text-sm font-medium">
              {lightboxIndex + 1} / {photos.length}
            </div>

            {/* Carousel */}
            <div ref={lightboxEmblaRef} className="overflow-hidden w-full max-w-5xl">
              <div className="flex">
                {photos.map((photo, i) => (
                  <div key={photo} className="flex-[0_0_100%] min-w-0 flex items-center justify-center">
                    <div className="relative aspect-[16/9] w-full">
                      <Image
                        src={photo}
                        alt={`${address} - Photo ${i + 1}`}
                        fill
                        className="object-contain"
                        sizes="100vw"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prev/Next arrows */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={scrollPrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  aria-label="Previous photo"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={scrollNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  aria-label="Next photo"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
