"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PastDueBannerProps {
  status: "warning" | "urgent" | "locked_bundles" | "locked_all";
  daysOverdue: number;
}

const BANNER_CONFIG = {
  warning: {
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-900",
    subtext: "text-blue-700",
    icon: "text-blue-500",
    btn: "bg-blue-600 hover:bg-blue-700 text-white",
    dismissible: true,
    message: "Your payment is past due. Please update your payment method.",
    iconPath:
      "M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z",
  },
  urgent: {
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-900",
    subtext: "text-amber-700",
    icon: "text-amber-500",
    btn: "bg-amber-600 hover:bg-amber-700 text-white",
    dismissible: true,
    message: null,
    iconPath:
      "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z",
  },
  locked_bundles: {
    bg: "bg-orange-50 border-orange-200",
    text: "text-orange-900",
    subtext: "text-orange-700",
    icon: "text-orange-500",
    btn: "bg-orange-600 hover:bg-orange-700 text-white",
    dismissible: true,
    message: "Premium features are restricted due to unpaid balance.",
    iconPath:
      "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z",
  },
  locked_all: {
    bg: "bg-red-50 border-red-200",
    text: "text-red-900",
    subtext: "text-red-700",
    icon: "text-red-500",
    btn: "bg-red-600 hover:bg-red-700 text-white",
    dismissible: false,
    message: "Your account is restricted. Please update your payment to restore access.",
    iconPath:
      "M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z",
  },
} as const;

export function PastDueBanner({ status, daysOverdue }: PastDueBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const config = BANNER_CONFIG[status];

  const message =
    status === "urgent"
      ? `Your payment is ${daysOverdue} days overdue. Features will be restricted soon.`
      : config.message;

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "w-full border-b px-4 py-3 flex items-center gap-3",
        config.bg,
      )}
      role="alert"
    >
      <div className="shrink-0">
        <svg
          className={cn("h-5 w-5", config.icon)}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={config.iconPath} />
        </svg>
      </div>

      <p className={cn("flex-1 text-sm font-medium", config.text)}>{message}</p>

      <Link
        href="/dashboard/billing"
        className={cn(
          "shrink-0 inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
          config.btn,
        )}
      >
        Update Payment
      </Link>

      {config.dismissible && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className={cn("shrink-0 p-1 rounded hover:bg-black/10 transition-colors", config.text)}
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
