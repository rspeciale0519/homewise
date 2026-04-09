import Link from "next/link";

interface CourseModule {
  id: string;
  title: string;
  type: string;
}

interface CourseCardProps {
  id: string;
  name: string;
  description: string | null;
  required: boolean;
  modules: CourseModule[];
  completedIds: Set<string>;
  totalDuration: number;
}

const STATUS_STYLES = {
  completed: { gradient: "from-green-900 to-green-800", badge: "bg-green-500/40 text-green-200", label: "✓ COMPLETED", cta: "Review →" },
  inProgress: { gradient: "from-indigo-950 to-indigo-900", badge: "bg-green-500/30 text-green-300", label: "IN PROGRESS", cta: "Continue →" },
  notStarted: { gradient: "from-slate-800 to-slate-700", badge: "bg-white/15 text-white", label: "NOT STARTED", cta: "Start →" },
  required: { gradient: "from-amber-900 to-amber-800", badge: "bg-amber-400/30 text-amber-200", label: "⚠ REQUIRED", cta: "Continue →" },
} as const;

function getStatus(modules: CourseModule[], completedIds: Set<string>, required: boolean) {
  const done = modules.filter((m) => completedIds.has(m.id)).length;
  if (done === modules.length && modules.length > 0) return "completed";
  if (required && done < modules.length) return "required";
  if (done > 0) return "inProgress";
  return "notStarted";
}

export function CourseCard({ id, name, description, required, modules, completedIds, totalDuration }: CourseCardProps) {
  const status = getStatus(modules, completedIds, required);
  const styles = STATUS_STYLES[status];
  const done = modules.filter((m) => completedIds.has(m.id)).length;
  const pct = modules.length > 0 ? (done / modules.length) * 100 : 0;

  const durationLabel = totalDuration >= 60
    ? `~${(totalDuration / 60).toFixed(1)} hrs`
    : `~${totalDuration} min`;

  return (
    <Link href={`/dashboard/training/courses/${id}`} className="block group">
      <div className={`aspect-video rounded-lg overflow-hidden bg-gradient-to-br ${styles.gradient} text-white relative flex flex-col justify-end p-3 group-hover:ring-2 group-hover:ring-white/20 transition-all`}>
        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <span className={`${styles.badge} text-[8px] font-bold px-1.5 py-px rounded`}>
            {styles.label}
          </span>
        </div>

        {/* Content */}
        <div>
          <h3 className="text-sm font-bold leading-tight">{name}</h3>
          {description && (
            <p className="text-[10px] opacity-70 mt-0.5 line-clamp-1">{description}</p>
          )}
          <div className="text-[9px] opacity-60 mt-1">
            {modules.length} modules · {durationLabel}
          </div>

          {/* Progress bar */}
          <div className="mt-2 bg-white/15 rounded-full h-1 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${status === "required" ? "bg-amber-400" : "bg-green-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[9px]">
            <span className="opacity-60">{done}/{modules.length}</span>
            <span className="font-semibold">{styles.cta}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
