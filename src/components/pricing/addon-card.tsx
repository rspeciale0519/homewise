"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { BundleWithFeatures } from "@/app/(marketing)/pricing/page";

interface AddonCardProps {
  addon: BundleWithFeatures;
  selected: boolean;
  onToggle: () => void;
  loading: boolean;
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

const ADDON_DISPLAY: Record<string, { icon: string; benefit: string }> = {
  extra_ai_credits: {
    icon: "⚡",
    benefit: "Boost your monthly AI usage allowance",
  },
  advanced_training_library: {
    icon: "🎓",
    benefit: "Premium courses & certifications",
  },
  property_alerts_pack: {
    icon: "🔔",
    benefit: "50 additional property alert slots",
  },
  white_label_cma_reports: {
    icon: "📄",
    benefit: "Your branding on every CMA report",
  },
};

export function AddonCard({ addon, selected, onToggle, loading }: AddonCardProps) {
  const display = ADDON_DISPLAY[addon.slug] ?? { icon: "✨", benefit: addon.description };

  return (
    <div
      className={cn(
        "relative rounded-xl border p-5 transition-all duration-200",
        selected
          ? "border-crimson-500 bg-crimson-50 shadow-md"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-soft",
      )}
    >
      {selected && (
        <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-crimson-600 flex items-center justify-center shadow">
          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      <div className="flex items-start gap-4">
        <span className="text-2xl shrink-0 leading-none mt-0.5" aria-hidden="true">
          {display.icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-navy-700 text-sm leading-snug">{addon.name}</p>
          <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{display.benefit}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-bold text-navy-700 text-base">
            {formatDollars(addon.monthlyAmount)}
            <span className="text-xs font-normal text-slate-400">/mo</span>
          </p>
        </div>
      </div>

      <div className="mt-4">
        <Button
          variant={selected ? "crimson" : "outline"}
          size="sm"
          className="w-full"
          onClick={onToggle}
          disabled={loading}
          aria-pressed={selected}
        >
          {selected ? "Remove" : "Add to Plan"}
        </Button>
      </div>
    </div>
  );
}
