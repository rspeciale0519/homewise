import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface CalculatorHubCardProps {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export function CalculatorHubCard({
  title,
  description,
  href,
  icon: Icon,
  badge,
}: CalculatorHubCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col items-center text-center p-6 rounded-xl",
        "bg-white border border-slate-100 shadow-soft",
        "hover:-translate-y-0.5 hover:shadow-elevated",
        "transition-all duration-200"
      )}
    >
      {badge && (
        <span className="absolute -top-2.5 right-3 bg-crimson-600 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          {badge}
        </span>
      )}
      <div className="w-12 h-12 rounded-xl bg-crimson-50 flex items-center justify-center mb-3 group-hover:bg-crimson-100 transition-colors">
        <Icon className="w-6 h-6 text-crimson-600" />
      </div>
      <h3 className="text-sm font-semibold text-navy-700 mb-1">{title}</h3>
      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
    </Link>
  );
}
