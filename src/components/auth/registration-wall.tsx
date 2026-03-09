"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface RegistrationWallProps {
  threshold?: number;
  mode?: "soft" | "forced";
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match?.[2] ?? null;
}

export function RegistrationWall({ threshold = 5, mode = "soft" }: RegistrationWallProps) {
  const pathname = usePathname();
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated
    const hasSession = getCookie("sb-access-token") || getCookie("sb-refresh-token");
    if (hasSession) return;

    // Check listing view count
    const views = parseInt(getCookie("hw_listing_views") ?? "0", 10);
    if (views >= threshold && !dismissed) {
      requestAnimationFrame(() => setShowModal(true));
    }
  }, [pathname, threshold, dismissed]);

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 relative">
        {mode === "soft" && (
          <button
            onClick={() => { setShowModal(false); setDismissed(true); }}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <div className="text-center">
          <div className="h-14 w-14 rounded-full bg-navy-100 flex items-center justify-center mx-auto mb-4">
            <svg className="h-7 w-7 text-navy-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" />
            </svg>
          </div>
          <h2 className="font-serif text-2xl font-semibold text-navy-700 mb-2">
            Create a Free Account
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Sign up to save your favorite listings, set up custom alerts, and get personalized recommendations.
          </p>

          <Link
            href="/auth/register"
            className="block w-full px-6 py-3 bg-crimson-600 text-white font-semibold rounded-xl hover:bg-crimson-700 transition-colors text-center mb-3"
          >
            Create Account
          </Link>
          <Link
            href="/auth/login"
            className="block w-full px-6 py-3 border-2 border-navy-600 text-navy-700 font-semibold rounded-xl hover:bg-navy-50 transition-colors text-center"
          >
            Sign In
          </Link>

          {mode === "soft" && (
            <button
              onClick={() => { setShowModal(false); setDismissed(true); }}
              className="mt-4 text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              Continue browsing
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
