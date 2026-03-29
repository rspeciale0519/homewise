"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface SettingsData {
  id: string | null;
  gracePeriodWarningDays: number;
  gracePeriodUrgentDays: number;
  gracePeriodLockoutDays: number;
  invoiceNotifyDays: number;
  trialDurationDays: number;
  transitionGraceDays: number;
  loyaltyDiscountPercent: number;
  updatedAt: string | null;
}

interface SettingFieldConfig {
  key: keyof Omit<SettingsData, "id" | "updatedAt">;
  label: string;
  description: string;
  min: number;
  max: number;
  suffix: string;
}

const FIELDS: SettingFieldConfig[] = [
  {
    key: "gracePeriodWarningDays",
    label: "Grace Period Warning",
    description: "Days into grace period before showing a warning to the agent",
    min: 1,
    max: 30,
    suffix: "days",
  },
  {
    key: "gracePeriodUrgentDays",
    label: "Grace Period Urgent",
    description: "Days into grace period before showing an urgent warning",
    min: 1,
    max: 60,
    suffix: "days",
  },
  {
    key: "gracePeriodLockoutDays",
    label: "Grace Period Lockout",
    description: "Days after which account features are locked out",
    min: 1,
    max: 90,
    suffix: "days",
  },
  {
    key: "invoiceNotifyDays",
    label: "Invoice Notification",
    description: "Days before invoice due date to send a reminder",
    min: 1,
    max: 30,
    suffix: "days",
  },
  {
    key: "trialDurationDays",
    label: "Trial Duration",
    description: "Length of free trial period for new subscriptions",
    min: 0,
    max: 90,
    suffix: "days",
  },
  {
    key: "transitionGraceDays",
    label: "Transition Grace Period",
    description: "Grace period when transitioning from legacy to new billing",
    min: 0,
    max: 90,
    suffix: "days",
  },
  {
    key: "loyaltyDiscountPercent",
    label: "Loyalty Discount",
    description: "Discount percentage for long-standing agents",
    min: 0,
    max: 100,
    suffix: "%",
  },
];

export function BillingSettingsForm() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const res = await fetch("/api/admin/billing/settings");
      if (!cancelled && res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);

    const { id, updatedAt, ...payload } = settings;
    void id;
    void updatedAt;

    const res = await fetch("/api/admin/billing/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      setSettings(data.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-navy-700 text-lg">Billing Configuration</h2>
          {settings.updatedAt && (
            <span className="text-xs text-slate-400">
              Last updated: {new Date(settings.updatedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">{field.label}</label>
              <p className="text-xs text-slate-400 mb-2">{field.description}</p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={field.min}
                  max={field.max}
                  value={settings[field.key]}
                  onChange={(e) =>
                    setSettings({ ...settings, [field.key]: Number(e.target.value) })
                  }
                  className="flex-1 accent-navy-600"
                />
                <span className="text-sm font-bold text-navy-700 w-16 text-right">
                  {settings[field.key]}{field.suffix === "%" ? "%" : ` ${field.suffix}`}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>{field.min}{field.suffix === "%" ? "%" : ""}</span>
                <span>{field.max}{field.suffix === "%" ? "%" : ""}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3">
          <Button onClick={handleSave} loading={saving}>
            Save Changes
          </Button>
          {saved && (
            <span className="text-xs font-medium text-emerald-600">Settings saved successfully.</span>
          )}
        </div>
      </div>
    </div>
  );
}
