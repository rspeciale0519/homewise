import type { Metadata } from "next";
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
      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
          Agent Tools
        </p>
        <h1 className="text-xl font-bold text-navy-800 tracking-tight">Training Hub</h1>
        <div className="flex gap-5 mt-3 pt-3 border-t border-slate-100">
          <div className="text-[10px] text-slate-500">
            <span className="text-sm font-bold text-navy-800">{courses.length}</span> Courses
          </div>
          <div className="text-[10px] text-slate-500">
            <span className="text-sm font-bold text-green-600">{completedCount}</span> Completed
          </div>
          <div className="text-[10px] text-slate-500">
            <span className="text-sm font-bold text-navy-800">{content.length}</span> Modules
          </div>
        </div>
      </div>

      {/* Courses */}
      {courses.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold text-navy-800 mb-3">📚 Your Courses</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
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

      {/* Divider */}
      {courses.length > 0 && <hr className="border-slate-100 mb-6" />}

      {/* All Modules */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-navy-800">All Modules</h2>
          <TrainingFilters categories={categories} types={types} />
        </div>
        <div
          id="modules-grid"
          className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4"
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
