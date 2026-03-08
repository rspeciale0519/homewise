import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { SubmissionDetail } from "@/components/admin/submission-detail";

export default async function BuyerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const submission = await prisma.buyerRequest.findUnique({ where: { id } });
  if (!submission) notFound();

  return (
    <div className="max-w-5xl">
      <SubmissionDetail
        type="buyer"
        id={submission.id}
        currentStatus={submission.status}
        fields={[
          { label: "Name", value: submission.name },
          { label: "Email", value: submission.email },
          { label: "Phone", value: submission.phone },
          { label: "Submitted", value: submission.createdAt.toLocaleString() },
          { label: "Areas of Interest", value: submission.areasOfInterest },
          { label: "Min Price", value: submission.minPrice ? `$${submission.minPrice.toLocaleString()}` : null },
          { label: "Max Price", value: submission.maxPrice ? `$${submission.maxPrice.toLocaleString()}` : null },
          { label: "Beds", value: submission.beds },
          { label: "Baths", value: submission.baths },
          { label: "Property Types", value: submission.propertyTypes.join(", ") || null },
          { label: "Timeline", value: submission.timeline },
          { label: "Comments", value: submission.comments },
        ]}
      />
    </div>
  );
}
