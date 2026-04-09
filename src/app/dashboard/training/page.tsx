import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Training — Dashboard" };

export default async function AgentTrainingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const content = await prisma.trainingContent.findMany({
    where: { published: true, audience: { in: ["agent", "public", "both"] } },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  const tracks = await prisma.trainingTrack.findMany({
    include: {
      items: {
        include: { content: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const completedIds = user
    ? (
        await prisma.trainingProgress.findMany({
          where: { userId: user.id, completed: true },
          select: { contentId: true },
        })
      ).map((p) => p.contentId)
    : [];

  const completedSet = new Set(completedIds);

  // Group content by category
  const grouped = content.reduce<Record<string, typeof content>>((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(item);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-700">Training Hub</h1>
        <p className="text-sm text-slate-500">Videos, documents, and resources to help you succeed</p>
      </div>

      {/* Tracks */}
      {tracks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-navy-700 mb-4">Learning Tracks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tracks.map((track) => (
              <div key={track.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-navy-700 mb-1">{track.name}</h3>
                {track.description && <p className="text-xs text-slate-500 mb-3">{track.description}</p>}
                <div className="space-y-2">
                  {track.items.map((item, i) => (
                    <Link
                      key={item.content.id}
                      href={`/dashboard/training/${item.content.id}`}
                      className="flex items-center gap-2 text-sm hover:bg-slate-50 rounded-lg p-1 -m-1 transition-colors"
                    >
                      {completedSet.has(item.content.id) ? (
                        <span className="h-6 w-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      ) : (
                        <span className="h-6 w-6 rounded-full bg-navy-50 text-navy-600 flex items-center justify-center text-xs font-semibold">
                          {i + 1}
                        </span>
                      )}
                      <span className="text-slate-700">{item.content.title}</span>
                      <span className="text-xs text-slate-400 capitalize ml-auto">{item.content.type}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content by category */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="mb-8">
          <h2 className="text-lg font-semibold text-navy-700 mb-4 capitalize">
            {category.replace("_", " ")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/training/${item.id}`}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow block"
              >
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                    item.type === "video" ? "bg-crimson-100 text-crimson-600" :
                    item.type === "document" ? "bg-blue-100 text-blue-600" :
                    "bg-navy-100 text-navy-600"
                  }`}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {item.type === "video" ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      )}
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-navy-700">{item.title}</h3>
                      {completedSet.has(item.id) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          Done
                        </span>
                      )}
                    </div>
                    {item.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-slate-400 capitalize">{item.type}</span>
                      {item.duration && <span className="text-xs text-slate-400">{item.duration} min</span>}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {content.length === 0 && (
        <div className="text-center py-16">
          <p className="text-slate-500">No training content available yet.</p>
        </div>
      )}
    </div>
  );
}
