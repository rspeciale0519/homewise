import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logActivity } from "@/lib/crm/log-activity";

const MILESTONES = [
  "Inspection Period",
  "Appraisal Ordered",
  "Appraisal Complete",
  "Financing Contingency Cleared",
  "Clear to Close",
  "Closing Day",
];

const DOCUMENTS = [
  { name: "Purchase Agreement", type: "contract" },
  { name: "Inspection Report", type: "inspection" },
  { name: "Appraisal", type: "appraisal" },
  { name: "Title Commitment", type: "title" },
  { name: "Closing Disclosure", type: "closing" },
];

const createSchema = z.object({
  address: z.string().min(1),
  purchasePrice: z.number().positive(),
  closingDate: z.string().optional(),
  propertyId: z.string().optional(),
});

interface RouteContext { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const transaction = await prisma.transaction.create({
    data: {
      contactId: id,
      address: parsed.data.address,
      purchasePrice: parsed.data.purchasePrice,
      closingDate: parsed.data.closingDate ? new Date(parsed.data.closingDate) : null,
      propertyId: parsed.data.propertyId,
      milestones: {
        create: MILESTONES.map((name, i) => ({ name, sortOrder: i })),
      },
      documents: {
        create: DOCUMENTS.map((doc) => ({ name: doc.name, type: doc.type })),
      },
    },
    include: {
      milestones: { orderBy: { sortOrder: "asc" } },
      documents: true,
    },
  });

  // Update contact stage to under_contract
  await prisma.contact.update({
    where: { id },
    data: { stage: "under_contract" },
  });

  await logActivity({
    contactId: id,
    type: "stage_change",
    title: "Transaction Created — Under Contract",
    description: `${parsed.data.address} at $${parsed.data.purchasePrice.toLocaleString()}`,
  });

  return NextResponse.json(transaction, { status: 201 });
}
