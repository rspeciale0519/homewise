interface ResultHeroProps {
  label: string;
  value: string;
  sublabel?: string;
}

export function ResultHero({ label, value, sublabel }: ResultHeroProps) {
  return (
    <div className="text-center py-4">
      <p className="text-xs text-navy-200 uppercase tracking-wider mb-1">{label}</p>
      <p className="font-serif text-display-sm font-bold text-white">{value}</p>
      {sublabel && (
        <p className="text-xs text-navy-300 mt-1">{sublabel}</p>
      )}
    </div>
  );
}
