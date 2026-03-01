"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/providers/supabase-provider";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  propertyId: string;
  isFavorited?: boolean;
}

export function FavoriteButton({ propertyId, isFavorited: initialFavorited = false }: FavoriteButtonProps) {
  const { user } = useSupabase();
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [animating, setAnimating] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push(`/register?redirectTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    const next = !favorited;
    setFavorited(next);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);

    try {
      if (next) {
        await fetch("/api/user/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId }),
        });
      } else {
        await fetch("/api/user/favorites", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId }),
        });
      }
    } catch {
      setFavorited(!next);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "absolute top-3 right-3 z-20 h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm",
        favorited
          ? "bg-crimson-600 text-white hover:bg-crimson-700"
          : "bg-white/90 backdrop-blur-sm text-slate-400 hover:text-crimson-600 hover:bg-white",
        animating && "scale-125"
      )}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
    >
      <svg
        className="h-4 w-4"
        fill={favorited ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={favorited ? 0 : 2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    </button>
  );
}
