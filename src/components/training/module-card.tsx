import Link from "next/link";
import { ModuleThumbnail } from "./module-thumbnail";

interface ModuleCardProps {
  id: string;
  title: string;
  type: string;
  category: string;
  duration: number | null;
  thumbnailUrl: string | null;
  url: string | null;
  body: string | null;
  completed: boolean;
}

export function ModuleCard({ id, title, type, category, duration, thumbnailUrl, url, body, completed }: ModuleCardProps) {
  return (
    <Link href={`/dashboard/training/${id}`} className="group block">
      <ModuleThumbnail
        type={type}
        thumbnailUrl={thumbnailUrl}
        url={url}
        body={body}
        title={title}
        duration={duration}
      />
      <div className="pt-2.5 px-0.5">
        <h3 className="text-sm font-semibold text-navy-800 leading-snug line-clamp-2 group-hover:text-navy-600 transition-colors">
          {title}
        </h3>
        <p className="text-sm text-slate-500 mt-0.5 capitalize">{category.replace("_", " ")}</p>
        <div className="flex items-center gap-2 mt-1">
          {duration != null && <span className="text-sm text-slate-400">{duration} min</span>}
          {completed && (
            <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium ml-auto">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Completed
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
