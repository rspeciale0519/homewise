export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-3 border-navy-100" />
          <div className="absolute inset-0 rounded-full border-3 border-transparent border-t-navy-600 animate-spin" />
        </div>
        <p className="text-sm text-slate-400 font-medium tracking-wide">Loading…</p>
      </div>
    </div>
  );
}
