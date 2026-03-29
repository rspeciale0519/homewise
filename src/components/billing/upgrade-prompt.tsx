"use client";

import Link from "next/link";

interface UpgradePromptProps {
  featureName: string;
  bundleSlug: string | null;
  bundleName?: string;
  remaining?: number | null;
  limit?: number | null;
}

export function UpgradePrompt({
  featureName,
  bundleSlug,
  bundleName,
  remaining,
  limit,
}: UpgradePromptProps) {
  const showUsageBar = remaining !== null && remaining !== undefined && limit !== null && limit !== undefined && limit > 0;
  const used = showUsageBar ? limit - remaining : 0;
  const usagePercent = showUsageBar ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 shadow-sm p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 h-9 w-9 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center mt-0.5">
          <svg className="h-4.5 w-4.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900">
            Upgrade to unlock {featureName}
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            This feature requires a premium subscription.
          </p>
        </div>
      </div>

      {showUsageBar && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-amber-700">
            <span>Used {used} of {limit} this month</span>
            <span className="font-medium">{remaining} remaining</span>
          </div>
          <div className="h-1.5 rounded-full bg-amber-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-300"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
      )}

      <div>
        {bundleSlug ? (
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5l7.5 7.5 7.5-7.5" />
            </svg>
            Subscribe to {bundleName ?? bundleSlug}
          </Link>
        ) : (
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-amber-300 text-amber-800 hover:bg-amber-100 transition-colors"
          >
            View Plans
          </Link>
        )}
      </div>
    </div>
  );
}
