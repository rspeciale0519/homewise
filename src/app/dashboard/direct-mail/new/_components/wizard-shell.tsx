"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEP_LABELS = ["Basics", "Spec", "Artwork", "List", "Review"] as const;

export function WizardShell({
  currentStep,
  onBack,
  onNext,
  onSaveExit,
  nextLabel,
  nextDisabled,
  busy,
  errorMessage,
  children,
}: {
  currentStep: number;
  onBack: () => void;
  onNext: () => void;
  onSaveExit: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  busy?: boolean;
  errorMessage?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4">
        <ol className="flex items-center gap-2 text-xs">
          {STEP_LABELS.map((label, idx) => {
            const stepNum = idx + 1;
            const isActive = stepNum === currentStep;
            const isDone = stepNum < currentStep;
            return (
              <li
                key={label}
                className={cn(
                  "flex items-center gap-2",
                  idx < STEP_LABELS.length - 1 && "after:h-px after:flex-1 after:bg-slate-200 after:ml-1",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                    isActive && "border-crimson-600 bg-crimson-50 text-crimson-700",
                    isDone && "border-emerald-200 bg-emerald-50 text-emerald-700",
                    !isActive && !isDone && "border-slate-200 bg-white text-slate-400",
                  )}
                >
                  {isDone ? "✓" : stepNum}
                </span>
                <span
                  className={cn(
                    "hidden sm:inline font-medium",
                    isActive ? "text-navy-700" : isDone ? "text-emerald-700" : "text-slate-400",
                  )}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="px-5 py-6 sm:px-7 sm:py-8">{children}</div>

      {errorMessage && (
        <div className="mx-5 mb-4 rounded-md border border-crimson-200 bg-crimson-50 px-3 py-2 text-xs text-crimson-700">
          {errorMessage}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          {currentStep > 1 ? (
            <Button variant="ghost" size="sm" onClick={onBack} disabled={busy}>
              ← Back
            </Button>
          ) : (
            <span />
          )}
          <Button variant="link" size="sm" onClick={onSaveExit} disabled={busy}>
            Save &amp; exit
          </Button>
        </div>
        <Button
          variant="crimson"
          size="md"
          onClick={onNext}
          disabled={nextDisabled || busy}
          loading={busy}
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
