import { cn } from "@/lib/utils";

interface WalkScoreDisplayProps {
  walkScore: number | null;
  transitScore: number | null;
  bikeScore: number | null;
}

export function WalkScoreDisplay({ walkScore, transitScore, bikeScore }: WalkScoreDisplayProps) {
  if (walkScore === null && transitScore === null && bikeScore === null) {
    return (
      <p className="text-sm text-slate-400 italic">Walk Score data unavailable for this location.</p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <ScoreCircle label="Walk Score" score={walkScore} />
      <ScoreCircle label="Transit Score" score={transitScore} />
      <ScoreCircle label="Bike Score" score={bikeScore} />
    </div>
  );
}

function ScoreCircle({ label, score }: { label: string; score: number | null }) {
  if (score === null) return null;

  const color =
    score >= 70 ? "text-green-600 border-green-200 bg-green-50" :
    score >= 50 ? "text-amber-600 border-amber-200 bg-amber-50" :
    "text-red-600 border-red-200 bg-red-50";

  return (
    <div className="text-center">
      <div className={cn("inline-flex items-center justify-center h-16 w-16 rounded-full border-2 mb-2", color)}>
        <span className="font-serif text-xl font-bold">{score}</span>
      </div>
      <p className="text-xs font-medium text-slate-600">{label}</p>
    </div>
  );
}
