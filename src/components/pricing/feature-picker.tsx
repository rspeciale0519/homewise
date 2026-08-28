"use client";

import { AddonCard } from "./addon-card";
import type { ProductWithFeatures } from "@/app/(marketing)/pricing/page";

interface FeaturePickerProps {
  addOns: ProductWithFeatures[];
  selectedAddOns: Set<string>;
  onToggleAddOn: (slug: string) => void;
  loading: boolean;
}

export function FeaturePicker({
  addOns,
  selectedAddOns,
  onToggleAddOn,
  loading,
}: FeaturePickerProps) {
  if (addOns.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-500">
        No add-ons are available now.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {addOns.map((addOn) => (
        <AddonCard
          key={addOn.id}
          addon={addOn}
          selected={selectedAddOns.has(addOn.slug)}
          onToggle={() => onToggleAddOn(addOn.slug)}
          loading={loading}
        />
      ))}
    </div>
  );
}
