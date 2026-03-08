import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import DOMPurify from "isomorphic-dompurify";
import { MarkCompleteButton } from "./mark-complete-button";

function extractYouTubeId(url: string): string | null {
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return shortMatch[1] ?? null;
  const longMatch = url.match(/[?&]v=([^&]+)/);
  return longMatch?.[1] ?? null;
}

function getFileExtension(fileKey: string): string {
  const parts = fileKey.split(".");
  return (parts[parts.length - 1] ?? "").toLowerCase();
}

function getFilename(fileKey: string): string {
  const parts = fileKey.split("/");
  return parts[parts.length - 1] ?? fileKey;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await prisma.trainingContent.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: item ? `${item.title} — Training` : "Training — Dashboard" };
}

export default async function TrainingDetailPage({ params }: PageProps) {
  const { id } = await params;

  const item = await prisma.trainingContent.findUnique({ where: { id } });

  if (!item || !item.published) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const progress = await prisma.trainingProgress.findUnique({
    where: { userId_contentId: { userId: user.id, contentId: id } },
  });

  let signedUrl: string | null = null;
  if (item.fileKey) {
    const admin = createAdminClient();
    const { data } = await admin.storage
      .from("training-files")
      .createSignedUrl(item.fileKey, 3600);
    signedUrl = data?.signedUrl ?? null;
  }

  const sanitizedBody = DOMPurify.sanitize(item.body ?? "");

  const videoId =
    item.type === "video" && item.url ? extractYouTubeId(item.url) : null;

  const fileExt = item.fileKey ? getFileExtension(item.fileKey) : null;
  const filename = item.fileKey ? getFilename(item.fileKey) : null;

  return (
    <div>
      <Link
        href="/dashboard/training"
        className="text-sm text-navy-600 hover:underline mb-4 inline-block"
      >
        &larr; Back to Training
      </Link>

      <h1 className="text-2xl font-bold text-navy-700 mb-4">{item.title}</h1>

      {/* Metadata row */}
      <div className="flex items-center gap-3 mb-6">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
            item.type === "video"
              ? "bg-crimson-100 text-crimson-700"
              : item.type === "document"
                ? "bg-blue-100 text-blue-700"
                : "bg-navy-100 text-navy-700"
          }`}
        >
          {item.type}
        </span>
        <span className="text-sm text-slate-500 capitalize">
          {item.category.replace("_", " ")}
        </span>
        {item.duration && (
          <span className="text-sm text-slate-400">{item.duration} min</span>
        )}
      </div>

      {/* Video embed */}
      {videoId && (
        <div className="aspect-video rounded-lg overflow-hidden mb-6">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            className="w-full h-full"
            allowFullScreen
            title={item.title}
          />
        </div>
      )}

      {/* PDF embed */}
      {signedUrl && fileExt === "pdf" && (
        <iframe
          src={signedUrl}
          className="w-full h-[600px] rounded-lg border border-slate-200 mb-6"
          title={filename ?? "PDF document"}
        />
      )}

      {/* Download button for non-PDF files */}
      {signedUrl && fileExt && fileExt !== "pdf" && (
        <div className="mb-6">
          <a
            href={signedUrl}
            download
            className="inline-flex items-center gap-2 px-4 py-2 bg-navy-600 text-white rounded-lg text-sm font-semibold hover:bg-navy-700"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download {filename}
          </a>
        </div>
      )}

      {/* Body content - sanitized with DOMPurify above */}
      {sanitizedBody && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizedBody }}
          />
        </div>
      )}

      {/* Mark complete button */}
      <MarkCompleteButton contentId={id} completed={!!progress?.completed} />
    </div>
  );
}
