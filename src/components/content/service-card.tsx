import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ServiceCardProps {
  title: string;
  description: string;
  href: string;
  imageUrl: string;
  tag?: string;
  className?: string;
}

export function ServiceCard({
  title,
  description,
  href,
  imageUrl,
  tag,
  className,
}: ServiceCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-card flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-elevated",
        className
      )}
    >
      {/* Image */}
      <div className="relative aspect-[16/9] overflow-hidden shrink-0">
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {tag && (
          <div className="absolute top-3 left-3">
            <span className="text-xs font-semibold tracking-wide px-2.5 py-1 rounded-full bg-crimson-600 text-white">
              {tag}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-1">
        {/* Accent line that animates in on hover */}
        <div className="h-0.5 w-8 bg-crimson-600 mb-4 transition-all duration-300 group-hover:w-16" />
        <h3 className="font-serif text-xl font-semibold text-navy-700 mb-2 group-hover:text-navy-900 transition-colors">
          {title}
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed flex-1">{description}</p>
        <div className="flex items-center gap-2 mt-5 text-sm font-semibold text-crimson-600 group-hover:text-crimson-700 transition-colors">
          <span>Read more</span>
          <svg
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
