import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { SubmissionDetail } from "@/components/admin/submission-detail";

export default async function EvaluationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const submission = await prisma.homeEvaluation.findUnique({ where: { id } });
  if (!submission) notFound();

  return (
    <div className="max-w-5xl">
      <SubmissionDetail
        type="evaluation"
        id={submission.id}
        currentStatus={submission.status}
        fields={[
          { label: "Name", value: submission.name },
          { label: "Email", value: submission.email },
          { label: "Phone", value: submission.phone },
          { label: "Submitted", value: submission.createdAt.toLocaleString() },
          { label: "Street Address", value: submission.streetAddress },
          { label: "City", value: submission.city },
          { label: "State", value: submission.state },
          { label: "ZIP", value: submission.zip },
          { label: "Bedrooms", value: submission.bedrooms },
          { label: "Bathrooms", value: submission.bathrooms },
          { label: "Square Feet", value: submission.sqft },
          { label: "Garage Spaces", value: submission.garageSpaces },
          { label: "Property Type", value: submission.propertyType },
          { label: "Sell Timeline", value: submission.sellTimeline },
          { label: "Listing Status", value: submission.listingStatus },
          { label: "Comments", value: submission.comments },
        ]}
      />
    </div>
  );
}
