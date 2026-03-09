"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface WalkScoreDisplayProps {
  walkScore: number | null;
  walkScoreDescription?: string | null;
  transitScore: number | null;
  transitScoreDescription?: string | null;
  bikeScore: number | null;
  bikeScoreDescription?: string | null;
}

export function WalkScoreDisplay({
  walkScore,
  walkScoreDescription,
  transitScore,
  transitScoreDescription,
  bikeScore,
  bikeScoreDescription,
}: WalkScoreDisplayProps) {
  if (walkScore === null && transitScore === null && bikeScore === null) {
    return (
      <p className="text-sm text-slate-400 italic">Walk Score data unavailable for this location.</p>
    );
  }

  return (
    <div className="space-y-8">
      {/* Score cards grid - responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {walkScore !== null && (
          <ScoreCard
            label="Walk Score"
            icon="🚶"
            score={walkScore}
            description={walkScoreDescription}
            explanation="Walkability for daily errands"
            index={0}
          />
        )}
        {transitScore !== null && (
          <ScoreCard
            label="Transit Score"
            icon="🚌"
            score={transitScore}
            description={transitScoreDescription}
            explanation="Public transportation access"
            index={1}
          />
        )}
        {bikeScore !== null && (
          <ScoreCard
            label="Bike Score"
            icon="🚴"
            score={bikeScore}
            description={bikeScoreDescription}
            explanation="Bikeability of the area"
            index={2}
          />
        )}
      </div>

      {/* Score legend - elegant and integrated */}
      <div className="bg-gradient-to-br from-navy-50 to-slate-50 border border-navy-100 rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-5 bg-gradient-to-b from-navy-700 to-navy-500 rounded-full"></div>
          <p className="text-xs font-semibold text-navy-700 uppercase tracking-widest">Understanding Your Scores</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ScaleItem score="90–100" label="Walker's Paradise" color="bg-emerald-500" />
          <ScaleItem score="70–89" label="Very Walkable" color="bg-emerald-500" />
          <ScaleItem score="50–69" label="Somewhat Walkable" color="bg-amber-500" />
          <ScaleItem score="0–49" label="Car-Dependent" color="bg-rose-500" />
        </div>
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  icon,
  score,
  description,
  explanation,
  index,
}: {
  label: string;
  icon: string;
  score: number;
  description?: string | null;
  explanation: string;
  index: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 90) return { ring: "text-emerald-600", bg: "from-emerald-50 to-emerald-25", accent: "bg-emerald-100 text-emerald-700" };
    if (score >= 70) return { ring: "text-emerald-600", bg: "from-emerald-50 to-slate-50", accent: "bg-emerald-100 text-emerald-700" };
    if (score >= 50) return { ring: "text-amber-600", bg: "from-amber-50 to-slate-50", accent: "bg-amber-100 text-amber-700" };
    return { ring: "text-rose-600", bg: "from-rose-50 to-slate-50", accent: "bg-rose-100 text-rose-700" };
  };

  const colors = getScoreColor(score);

  return (
    <div
      ref={ref}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-200 transition-all duration-500 hover:border-navy-300 hover:shadow-lg",
        "transform",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
      style={{
        transitionDelay: isVisible ? `${index * 100}ms` : "0ms",
      }}
    >
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-60 group-hover:opacity-100 transition-opacity duration-300`} />

      {/* Content */}
      <div className="relative p-6 md:p-8">
        {/* Icon and header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="text-3xl md:text-4xl">{icon}</div>
          <span className={cn("px-3 py-1 rounded-full text-xs font-semibold", colors.accent)}>
            {score >= 90 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Fair" : "Limited"}
          </span>
        </div>

        {/* Score ring visualization */}
        <div className="mb-6 flex justify-center">
          <div className="relative w-28 h-28">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-200" />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - score / 100)}`}
                className={cn("transition-all duration-1000", colors.ring)}
                style={{
                  transitionDelay: isVisible ? `${index * 100 + 200}ms` : "0ms",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-serif text-3xl md:text-4xl font-bold text-navy-700">{score}</span>
              <span className="text-xs text-slate-500 mt-1">/ 100</span>
            </div>
          </div>
        </div>

        {/* Label and description */}
        <div className="text-center">
          <h3 className="font-serif text-lg md:text-xl font-semibold text-navy-700 mb-1">{label}</h3>
          {description && (
            <p className="text-sm font-medium text-slate-700 mb-3 leading-snug">{description}</p>
          )}
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed">{explanation}</p>
        </div>
      </div>

      {/* Hover accent line */}
      <div className={cn("absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-navy-400 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left")} />
    </div>
  );
}

function ScaleItem({
  score,
  label,
  color,
}: {
  score: string;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/50 transition-colors duration-200">
      <div className={cn("w-3 h-3 rounded-full mt-1 flex-shrink-0", color)} />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-navy-700">{score}</p>
        <p className="text-xs text-slate-600">{label}</p>
      </div>
    </div>
  );
}
