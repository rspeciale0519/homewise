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
      <div className="pt-2 px-0.5">
        <h3 className="text-sm font-semibold text-navy-800 leading-snug line-clamp-2 group-hover:text-navy-600 transition-colors">
          {title}
        </h3>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-xs text-slate-500 capitalize">{category.replace("_", " ")}</span>
          {duration != null && <span className="text-xs text-slate-400">· {duration} min</span>}
          {completed && <span className="ml-auto text-green-600 text-xs">✓</span>}
        </div>
      </div>
    </Link>
  );
}
