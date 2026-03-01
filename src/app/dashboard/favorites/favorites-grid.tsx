"use client";

import { useState } from "react";
import type { FavoriteProperty } from "@/types/user";
import { cn } from "@/lib/utils";

interface FavoritesGridProps {
  favorites: FavoriteProperty[];
}

export function FavoritesGrid({ favorites: initialFavorites }: FavoritesGridProps) {
  const [favorites, setFavorites] = useState(initialFavorites);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");

  const handleStartEdit = (fav: FavoriteProperty) => {
    setEditingId(fav.id);
    setEditNotes(fav.notes ?? "");
  };

  const handleSaveNotes = async (propertyId: string) => {
    await fetch("/api/user/favorites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, notes: editNotes }),
    });
    setFavorites((prev) =>
      prev.map((f) => (f.propertyId === propertyId ? { ...f, notes: editNotes || null } : f))
    );
    setEditingId(null);
  };

  const handleRemove = async (propertyId: string) => {
    setFavorites((prev) => prev.filter((f) => f.propertyId !== propertyId));
    await fetch("/api/user/favorites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId }),
    });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {favorites.map((fav) => (
        <div
          key={fav.id}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
        >
          <div className="p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-sm font-medium text-navy-700">Property {fav.propertyId}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Saved {new Date(fav.savedAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleRemove(fav.propertyId)}
                className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-crimson-600 hover:bg-crimson-50 transition-colors"
                aria-label="Remove from favorites"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Notes section */}
            {editingId === fav.id ? (
              <div className="space-y-2">
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600 resize-none"
                  rows={3}
                  placeholder="Add private notes about this property..."
                  maxLength={1000}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveNotes(fav.propertyId)}
                    className="px-3 py-1.5 text-xs font-medium bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {fav.notes ? (
                  <p className="text-sm text-slate-600 bg-cream-50 rounded-lg px-3 py-2 mb-2">
                    {fav.notes}
                  </p>
                ) : null}
                <button
                  onClick={() => handleStartEdit(fav)}
                  className={cn(
                    "text-xs font-medium transition-colors",
                    fav.notes
                      ? "text-slate-400 hover:text-navy-600"
                      : "text-navy-600 hover:text-navy-700"
                  )}
                >
                  {fav.notes ? "Edit Notes" : "Add Notes"}
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
