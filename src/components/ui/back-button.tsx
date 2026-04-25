"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  fallbackHref: string;
  label?: string;
  className?: string;
  iconClassName?: string;
  hideLabelOnMobile?: boolean;
}

export function useBackHandler(fallbackHref: string) {
  const router = useRouter();

  return useCallback(() => {
    if (typeof window === "undefined") {
      router.push(fallbackHref);
      return;
    }

    const hasHistory = window.history.length > 1;
    let sameOrigin = true;
    if (document.referrer) {
      try {
        sameOrigin =
          new URL(document.referrer).origin === window.location.origin;
      } catch {
        sameOrigin = false;
      }
    }

    if (hasHistory && sameOrigin) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }, [router, fallbackHref]);
}

export function BackButton({
  fallbackHref,
  label = "Back",
  className,
  iconClassName,
  hideLabelOnMobile = false,
}: BackButtonProps) {
  const handleClick = useBackHandler(fallbackHref);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-700 transition-colors",
        className,
      )}
    >
      <ArrowLeft className={cn("h-4 w-4", iconClassName)} aria-hidden="true" />
      <span className={cn(hideLabelOnMobile && "hidden sm:inline")}>
        {label}
      </span>
    </button>
  );
}
