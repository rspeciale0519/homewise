import Link from "next/link";
import { ModuleThumbnail } from "./module-thumbnail";

interface ModuleCardProps {
  id: string;
  slug: string | null;
  title: string;
  type: string;
  category: string;
  duration: number | null;
  thumbnailUrl: string | null;
  url: string | null;
  body: string | null;
  completed: boolean;
}

export function ModuleCard({ id, slug, title, type, category, duration, thumbnailUrl, url, body, completed }: ModuleCardProps) {
  const href = slug ? `/dashboard/training/${slug}` : `/dashboard/training/${id}`;
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-slate-100 bg-white hover:border-crimson-200 hover:bg-crimson-50/30 transition-all duration-200 overflow-hidden"
    >
      <ModuleThumbnail
        type={type}
        thumbnailUrl={thumbnailUrl}
        url={url}
        body={body}
        title={title}
        duration={duration}
      />
      <div className="p-4">
        <p className="text-sm font-semibold text-navy-700 group-hover:text-crimson-700 transition-colors line-clamp-2">
          {title}
        </p>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed capitalize">
          {category.replace("_", " ")}
          {duration != null && ` · ${duration} min`}
        </p>
        {completed && (
          <div className="flex items-center gap-1.5 mt-2">
            <svg className="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs text-green-600 font-medium">Completed</span>
          </div>
        )}
      </div>
    </Link>
  );
}
