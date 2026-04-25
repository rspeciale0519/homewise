import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getYouTubeEmbedUrl } from "@/lib/training/youtube";
import { MarkCompleteButton } from "@/components/training/mark-complete-button";
import { AdminAuthoredHtml } from "@/components/training/admin-authored-html";
import { resolveTrainingSlug } from "@/lib/slug/resolve";
import { BackButton } from "@/components/ui/back-button";

export const dynamic = "force-dynamic";

function getFileExtension(fileKey: string): string {
  const parts = fileKey.split(".");
  return (parts[parts.length - 1] ?? "").toLowerCase();
}

function getFilename(fileKey: string): string {
  const parts = fileKey.split("/");
  return parts[parts.length - 1] ?? fileKey;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveTrainingSlug(slug);
  if (!resolved) return { title: "Training — Dashboard" };
  const content = await prisma.trainingContent.findUnique({
    where: { id: resolved.record.id },
    select: { title: true },
  });
  return { title: content ? `${content.title} — Training` : "Training — Dashboard" };
}

const CUID_PATTERN = /^c[a-z0-9]{20,}$/i;

export default async function TrainingDetailPage({ params }: PageProps) {
  const { slug } = await params;

  if (CUID_PATTERN.test(slug)) {
    const byId = await prisma.trainingContent.findUnique({
      where: { id: slug },
      select: { slug: true },
    });
    if (byId?.slug) redirect(`/dashboard/training/${byId.slug}`);
    if (!byId) notFound();
  }

  const resolved = await resolveTrainingSlug(slug);
  if (!resolved) notFound();

  if (resolved.redirectFrom && resolved.record.slug) {
    redirect(`/dashboard/training/${resolved.record.slug}`);
  }

  const item = await prisma.trainingContent.findUnique({
    where: { id: resolved.record.id },
  });
  if (!item || !item.published) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const progress = await prisma.trainingProgress.findUnique({
    where: { userId_contentId: { userId: user.id, contentId: item.id } },
  });

  let courseContext: { id: string; name: string; items: { content: { id: string; slug: string | null; title: string; type: string } }[] } | null = null;
  let upNextModule: { id: string; slug: string | null; title: string; type: string } | null = null;
  try {
    const courseItems = await prisma.trainingCourseItem.findMany({
      where: { contentId: item.id },
      include: {
        course: {
          include: {
            items: {
              include: { content: { select: { id: true, slug: true, title: true, type: true, duration: true } } },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });
    courseContext = courseItems[0]?.course ?? null;
    if (courseContext) {
      const currentIdx = courseContext.items.findIndex((i) => i.content.id === item.id);
      const next = courseContext.items[currentIdx + 1];
      if (next) upNextModule = next.content;
    }
  } catch {
    // Course context is optional — don't break the page if it fails
  }

  let signedUrl: string | null = null;
  if (item.fileKey) {
    const admin = createAdminClient();
    const { data } = await admin.storage.from("training-files").createSignedUrl(item.fileKey, 3600);
    signedUrl = data?.signedUrl ?? null;
  }

  const bodyHtml = item.body ?? "";
  const embedUrl = item.type === "video" && item.url ? getYouTubeEmbedUrl(item.url) : null;
  const fileExt = item.fileKey ? getFileExtension(item.fileKey) : null;
  const filename = item.fileKey ? getFilename(item.fileKey) : null;

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-5xl">
      <BackButton
        fallbackHref="/dashboard/training"
        label="Back to Training Hub"
        className="mb-4 text-navy-600 hover:underline gap-1"
        iconClassName="h-3.5 w-3.5"
      />

      {courseContext && (
        <div className="mt-2 mb-4">
          <Link href={`/dashboard/training/courses/${courseContext.id}`} className="text-xs text-slate-500 hover:text-navy-600">
            📚 {courseContext.name}
          </Link>
        </div>
      )}

      <h1 className="text-2xl font-bold text-navy-700 mb-3">{item.title}</h1>

      <div className="flex items-center gap-3 mb-6">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
          item.type === "video" ? "bg-red-100 text-red-700" :
          item.type === "document" ? "bg-blue-100 text-blue-700" :
          item.type === "article" ? "bg-green-100 text-green-700" :
          "bg-purple-100 text-purple-700"
        }`}>
          {item.type}
        </span>
        <span className="text-sm text-slate-500 capitalize">{item.category.replace("_", " ")}</span>
        {item.duration && <span className="text-sm text-slate-400">{item.duration} min</span>}
      </div>

      {embedUrl && (
        <div className="aspect-video rounded-lg overflow-hidden mb-6 bg-black">
          <iframe src={embedUrl} className="w-full h-full" allowFullScreen title={item.title} />
        </div>
      )}

      {signedUrl && fileExt === "pdf" && (
        <iframe src={signedUrl} className="w-full h-[600px] rounded-lg border border-slate-200 mb-6" title={filename ?? "PDF"} />
      )}

      {signedUrl && fileExt && fileExt !== "pdf" && (
        <div className="mb-6">
          <a href={signedUrl} download className="inline-flex items-center gap-2 px-4 py-2 bg-navy-600 text-white rounded-lg text-sm font-semibold hover:bg-navy-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download {filename}
          </a>
        </div>
      )}

      {bodyHtml && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <AdminAuthoredHtml html={bodyHtml} className="prose prose-sm max-w-none" />
        </div>
      )}

      {item.description && !bodyHtml && (
        <p className="text-sm text-slate-600 mb-6">{item.description}</p>
      )}

      <MarkCompleteButton contentId={item.id} completed={!!progress?.completed} />

      {upNextModule && courseContext && (
        <div className="mt-8 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
          <p className="text-xs font-semibold text-indigo-600 mb-2">Up next in {courseContext.name}</p>
          <Link
            href={upNextModule.slug
              ? `/dashboard/training/${upNextModule.slug}`
              : `/dashboard/training/${upNextModule.id}`}
            className="flex items-center gap-3 group"
          >
            <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-navy-700 group-hover:text-indigo-600 transition-colors">{upNextModule.title}</p>
              <p className="text-xs text-slate-500 capitalize">{upNextModule.type}</p>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
