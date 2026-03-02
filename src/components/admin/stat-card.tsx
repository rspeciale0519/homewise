import Link from "next/link";

const bgMap = {
  crimson: "bg-crimson-50 text-crimson-600",
  navy: "bg-navy-50 text-navy-600",
  gold: "bg-amber-50 text-amber-600",
};

interface StatCardProps {
  label: string;
  value: number | string;
  subValue?: string;
  href: string;
  icon: React.ReactNode;
  accent: "crimson" | "navy" | "gold";
}

export function StatCard({ label, value, subValue, href, icon, accent }: StatCardProps) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-card hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${bgMap[accent]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-navy-700">{value}</p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          {subValue && (
            <span className="text-[10px] font-semibold text-crimson-600 bg-crimson-50 px-1.5 py-0.5 rounded-full">
              {subValue}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
