"use client";

import { useState } from "react";

const MINUTE_OPTIONS = [10, 15, 20, 30, 45, 60];

export function CommuteFilter({
  active,
  onUpdate,
}: {
  active: boolean;
  onUpdate: (updates: Record<string, string | undefined>) => void;
}) {
  const [address, setAddress] = useState("");
  const [minutes, setMinutes] = useState(20);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const apply = async () => {
    if (address.trim().length < 3) return;
    setState("loading");
    setError(null);
    try {
      const res = await fetch(
        `/api/commute-polygon?address=${encodeURIComponent(address)}&minutes=${minutes}`,
      );
      const data = (await res.json()) as { polygon?: [number, number][]; error?: string };
      if (!res.ok || !data.polygon) {
        throw new Error(data.error ?? "Could not compute drive-time area");
      }
      onUpdate({ polygon: JSON.stringify(data.polygon) });
      setState("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setState("error");
    }
  };

  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">
        Max Drive Time to Work
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Work address, e.g. 400 W Church St, Orlando"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="flex-1 min-w-[220px] h-10 px-3 text-sm bg-white border border-slate-200 rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-all"
        />
        <select
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="h-10 px-3 text-sm bg-white border border-slate-200 rounded-xl text-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-600"
        >
          {MINUTE_OPTIONS.map((m) => (
            <option key={m} value={m}>{m} min</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void apply()}
          disabled={state === "loading" || address.trim().length < 3}
          className="h-10 px-4 rounded-xl bg-navy-600 text-white text-sm font-semibold hover:bg-navy-700 transition-colors disabled:opacity-50"
        >
          {state === "loading" ? "Computing…" : "Apply"}
        </button>
        {active && (
          <button
            type="button"
            onClick={() => onUpdate({ polygon: undefined })}
            className="h-10 px-3 rounded-xl text-sm font-medium text-slate-500 hover:text-navy-700 transition-colors"
          >
            Clear drive-time area
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-crimson-600">{error}</p>}
    </div>
  );
}
