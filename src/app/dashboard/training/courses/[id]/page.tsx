import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/ui/back-button";
import { ModuleThumbnail } from "@/components/training/module-thumbnail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const course = await prisma.trainingCourse.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: course ? `${course.name} — Training` : "Course — Training" };
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { id } = await params;

  const course = await prisma.trainingCourse.findUnique({
    where: { id },
    include: {
      items: {
        include: { content: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!course) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const completedRows = await prisma.trainingProgress.findMany({
    where: {
      userId: user.id,
      completed: true,
      contentId: { in: course.items.map((i) => i.content.id) },
    },
    select: { contentId: true },
  });

  const completedSet = new Set(completedRows.map((p) => p.contentId));
  const totalModules = course.items.length;
  const completedCount = course.items.filter((i) => completedSet.has(i.content.id)).length;
  const pct = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;
  const totalDuration = course.items.reduce((sum, i) => sum + (i.content.duration ?? 0), 0);

  // Find next incomplete module
  const nextModule = course.items.find((i) => !completedSet.has(i.content.id));

  const statusLabel = completedCount === totalModules && totalModules > 0
    ? "Completed" : completedCount > 0 ? "In Progress" : "Not Started";

  const gradientClass = completedCount === totalModules && totalModules > 0
    ? "from-green-900 to-green-800"
    : course.required
      ? "from-amber-900 to-amber-800"
      : "from-indigo-950 to-indigo-900";

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-5xl">
      <BackButton
        fallbackHref="/dashboard/training"
        label="Back to Training Hub"
        className="mb-6 text-navy-600 hover:underline gap-1"
        iconClassName="h-3.5 w-3.5"
      />

      {/* Course banner */}
      <div className={`bg-gradient-to-br ${gradientClass} text-white rounded-xl p-6 mb-8`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded">COURSE</span>
          <span className="text-xs font-semibold bg-white/10 px-2 py-0.5 rounded">{statusLabel}</span>
          {course.required && <span className="text-xs font-semibold bg-amber-400/30 text-amber-200 px-2 py-0.5 rounded">Required</span>}
        </div>
        <h1 className="text-2xl font-bold">{course.name}</h1>
        {course.description && <p className="text-sm opacity-80 mt-1">{course.description}</p>}
        <div className="flex items-center gap-4 mt-3 text-xs opacity-70">
          <span>{totalModules} modules</span>
          <span>{totalDuration >= 60 ? `~${(totalDuration / 60).toFixed(1)} hrs` : `~${totalDuration} min`}</span>
        </div>
        <div className="mt-4 bg-white/15 rounded-full h-2 overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-xs">
          <span className="opacity-70">{completedCount} of {totalModules} completed</span>
          <span className="font-semibold">{pct}%</span>
        </div>
      </div>

      {/* Module list */}
      <h2 className="text-sm font-bold text-navy-800 mb-4">Modules</h2>
      <div className="space-y-3">
        {course.items.map((item, idx) => {
          const isCompleted = completedSet.has(item.content.id);
          const isNext = nextModule?.content.id === item.content.id;
          return (
            <Link
              key={item.content.id}
              href={item.content.slug ? `/dashboard/training/${item.content.slug}` : `/dashboard/training/${item.content.id}`}
              className={`flex items-center gap-4 p-3 rounded-xl border transition-all hover:shadow-sm ${
                isNext ? "border-indigo-300 bg-indigo-50/50" :
                isCompleted ? "border-slate-100 bg-slate-50/50" :
                "border-slate-200 bg-white"
              }`}
            >
              {/* Order number or check */}
              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                isCompleted ? "bg-green-100 text-green-600" :
                isNext ? "bg-indigo-100 text-indigo-600" :
                "bg-slate-100 text-slate-500"
              }`}>
                {isCompleted ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>

              {/* Thumbnail */}
              <div className="w-24 shrink-0">
                <ModuleThumbnail
                  type={item.content.type}
                  thumbnailUrl={item.content.thumbnailUrl}
                  url={item.content.url}
                  body={item.content.body}
                  title={item.content.title}
                  duration={item.content.duration}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${isCompleted ? "text-slate-500 line-through" : "text-navy-700"}`}>
                  {item.content.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-400 capitalize">{item.content.type}</span>
                  {item.content.duration && <span className="text-xs text-slate-400">{item.content.duration} min</span>}
                </div>
              </div>

              {/* Status */}
              {isNext && (
                <span className="text-xs font-semibold text-indigo-600 shrink-0">Up Next →</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
