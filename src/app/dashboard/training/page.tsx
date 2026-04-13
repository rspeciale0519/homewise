import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { CourseCard } from "@/components/training/course-card";
import { ModuleCard } from "@/components/training/module-card";
import { TrainingFilters } from "./training-filters";

export const metadata: Metadata = { title: "Training Hub — Dashboard" };

export default async function AgentTrainingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [content, courses, completedRows] = await Promise.all([
    prisma.trainingContent.findMany({
      where: { published: true, audience: { in: ["agent", "public", "both"] } },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.trainingCourse.findMany({
      include: {
        items: {
          include: { content: { select: { id: true, title: true, type: true, duration: true } } },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    user
      ? prisma.trainingProgress.findMany({
          where: { userId: user.id, completed: true },
          select: { contentId: true },
        })
      : [],
  ]);

  const completedIds = new Set(completedRows.map((p) => p.contentId));
  const completedCount = completedIds.size;
  const categories = [...new Set(content.map((c) => c.category))];
  const types = [...new Set(content.map((c) => c.type))];

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl">
      {/* Header — matches Document Library pattern */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <Link href="/dashboard/agent-hub" className="hover:text-navy-600 transition-colors">
            Resources Hub
          </Link>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-slate-500">Training Hub</span>
        </div>
        <h1 className="font-serif text-display-sm sm:text-display-md text-navy-700">
          Training Hub
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Videos, guides, and resources to help you succeed.
        </p>
        {/* Stats */}
        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
              {courses.length}
            </span>
            <span className="text-sm text-slate-500">Courses</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded-full">
              {completedCount}
            </span>
            <span className="text-sm text-slate-500">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
              {content.length}
            </span>
            <span className="text-sm text-slate-500">Modules</span>
          </div>
        </div>
      </div>

      {/* Courses */}
      {courses.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-1.5 w-1.5 rounded-full bg-crimson-600" />
            <h2 className="font-serif text-xl font-semibold text-navy-700">
              Your Courses
            </h2>
            <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
              {courses.length}
            </span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {courses.map((course) => {
              const modules = course.items.map((i) => ({
                id: i.content.id,
                title: i.content.title,
                type: i.content.type,
              }));
              const totalDuration = course.items.reduce(
                (sum, i) => sum + (i.content.duration ?? 0), 0,
              );
              return (
                <CourseCard
                  key={course.id}
                  id={course.id}
                  name={course.name}
                  description={course.description}
                  required={course.required}
                  modules={modules}
                  completedIds={completedIds}
                  totalDuration={totalDuration}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* All Modules */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-crimson-600" />
            <h2 className="font-serif text-xl font-semibold text-navy-700">
              All Modules
            </h2>
            <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
              {content.length}
            </span>
          </div>
          <TrainingFilters categories={categories} types={types} />
        </div>
        <div
          id="modules-grid"
          className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4"
        >
          {content.map((item) => (
            <div
              key={item.id}
              data-category={item.category}
              data-type={item.type}
            >
              <ModuleCard
                id={item.id}
                title={item.title}
                type={item.type}
                category={item.category}
                duration={item.duration}
                thumbnailUrl={item.thumbnailUrl}
                url={item.url}
                body={item.body}
                completed={completedIds.has(item.id)}
              />
            </div>
          ))}
        </div>

        {content.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-slate-400">No training modules available yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}
