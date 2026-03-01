import Image from "next/image";
import { SearchWidget } from "./search-widget";

export function HeroSection() {
  return (
    <section className="relative h-[calc(100svh-5rem)] md:h-[calc(100svh-6rem)] min-h-[560px] flex flex-col overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=80"
          alt="Luxury Florida home"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        {/* Layered gradient: vignette + bottom darkening */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(46,39,109,0.35)_0%,rgba(20,18,47,0.78)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-transparent to-navy-950/20" />
      </div>

      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-crimson-600 to-transparent opacity-60 z-10" />

      {/* Content */}
      <div className="relative z-10 flex flex-col flex-1">
        {/* Headline — centered, vertically centered in upper portion */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-16 pb-4">
          {/* Eyebrow */}
          <div
            className="flex items-center gap-3 mb-7 opacity-0 animate-fade-in"
            style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
          >
            <span className="h-px w-10 bg-crimson-500" />
            <span className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-300">
              Central Florida&apos;s Trusted Brokerage
            </span>
            <span className="h-px w-10 bg-crimson-500" />
          </div>

          {/* Main headline */}
          <h1
            className="font-serif text-white leading-[1.05] mb-5 opacity-0 animate-fade-in"
            style={{ animationDelay: "0.25s", animationFillMode: "forwards" }}
          >
            <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold">
              Your Home<span className="text-crimson-500">.</span>
            </span>
            <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold italic text-cream-100">
              Your Future<span className="text-crimson-500">.</span>
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className="text-slate-300 text-base sm:text-lg max-w-xl leading-relaxed opacity-0 animate-fade-in"
            style={{ animationDelay: "0.42s", animationFillMode: "forwards" }}
          >
            186+ expert agents across 5 counties — ready to guide you home.
          </p>

          {/* Scroll hint */}
          <div
            className="hidden md:flex flex-col items-center gap-1.5 mt-8 opacity-0 animate-fade-in"
            style={{ animationDelay: "0.6s", animationFillMode: "forwards" }}
            aria-hidden="true"
          >
            <span className="text-xs text-slate-400 tracking-widest uppercase">Explore</span>
            <div className="w-px h-8 bg-gradient-to-b from-slate-400 to-transparent" />
          </div>
        </div>

        {/* Search widget — anchored to bottom of hero */}
        <div
          className="px-4 pb-10 sm:pb-14 opacity-0 animate-fade-in"
          style={{ animationDelay: "0.55s", animationFillMode: "forwards" }}
        >
          <SearchWidget />
        </div>
      </div>
    </section>
  );
}
