export default function Loading() {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12" aria-hidden="true">
          <div className="absolute inset-0 rounded-full border-2 border-navy-100" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-navy-600 animate-spin" />
        </div>
        <p className="text-sm text-slate-400 font-medium tracking-wide">Loading…</p>
      </div>
    </div>
  );
}
