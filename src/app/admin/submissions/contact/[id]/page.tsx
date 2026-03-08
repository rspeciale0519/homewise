import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { SubmissionDetail } from "@/components/admin/submission-detail";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const submission = await prisma.contactSubmission.findUnique({ where: { id } });
  if (!submission) notFound();

  return (
    <div className="max-w-5xl">
      <SubmissionDetail
        type="contact"
        id={submission.id}
        currentStatus={submission.status}
        fields={[
          { label: "Name", value: submission.name },
          { label: "Email", value: submission.email },
          { label: "Phone", value: submission.phone },
          { label: "Submitted", value: submission.createdAt.toLocaleString() },
          { label: "Message", value: submission.message },
        ]}
      />
    </div>
  );
}
