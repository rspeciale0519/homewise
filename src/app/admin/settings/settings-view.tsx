"use client";

import { useEffect, useState } from "react";

interface RegConfig {
  id: string;
  viewThreshold: number;
  mode: string;
  enabled: boolean;
}

export function SettingsView() {
  const [config, setConfig] = useState<RegConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const res = await fetch("/api/admin/settings");
      if (!cancelled && res.ok) setConfig(await res.json());
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        viewThreshold: config.viewThreshold,
        mode: config.mode,
        enabled: config.enabled,
      }),
    });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="space-y-6">
      {/* Registration Wall */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-navy-700 text-lg">Registration Wall</h2>
          <button
            onClick={() => setConfig({ ...config, enabled: !config.enabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.enabled ? "bg-green-500" : "bg-slate-300"
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              config.enabled ? "translate-x-6" : "translate-x-1"
            }`} />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Require visitors to register after viewing a certain number of listings. This helps capture leads while still allowing browsing.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-2 block">View Threshold</label>
            <p className="text-xs text-slate-400 mb-2">Number of free listing views before requiring registration</p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={20}
                value={config.viewThreshold}
                onChange={(e) => setConfig({ ...config, viewThreshold: Number(e.target.value) })}
                className="flex-1 accent-navy-600"
              />
              <span className="text-lg font-bold text-navy-700 w-8 text-center">{config.viewThreshold}</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Aggressive (1)</span>
              <span>Relaxed (20)</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 mb-2 block">Wall Mode</label>
            <p className="text-xs text-slate-400 mb-2">How strictly to enforce registration</p>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="mode"
                  value="soft"
                  checked={config.mode === "soft"}
                  onChange={() => setConfig({ ...config, mode: "soft" })}
                  className="mt-0.5 accent-navy-600"
                />
                <div>
                  <p className="text-sm font-medium text-navy-700">Soft Wall</p>
                  <p className="text-xs text-slate-400">Shows a dismissible overlay — visitors can skip registration</p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="mode"
                  value="hard"
                  checked={config.mode === "hard"}
                  onChange={() => setConfig({ ...config, mode: "hard" })}
                  className="mt-0.5 accent-navy-600"
                />
                <div>
                  <p className="text-sm font-medium text-navy-700">Hard Wall</p>
                  <p className="text-xs text-slate-400">Requires registration — visitors must sign up to continue browsing</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-navy-600 text-white rounded-lg text-sm font-semibold hover:bg-navy-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
