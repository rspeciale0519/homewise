import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { logApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getOrCreateStripeCustomer } from "@/lib/billing/stripe-sync";
import {
  adminProcessCardPaymentSchema,
  adminRecordOfflinePaymentSchema,
} from "@/schemas/billing.schema";
import { readJsonBodyWithLimit, RequestBodyTooLargeError } from "@/lib/http/request-body";

function operationRecordId(agentId: string, operationId: string): string {
  const digest = createHash("sha256")
    .update(`${agentId}:${operationId}`)
    .digest("hex");
  return `adminpay_${digest}`;
}

function isUniqueConflict(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error &&
    (error as { code?: unknown }).code === "P2002";
}

function normalizeOfflineNotes(notes: string | undefined): string | null {
  const normalized = notes?.trim();
  return normalized ? normalized : null;
}

function isMatchingCardPayment(
  record: {
    agentId: string;
    amount: number;
    paymentType: string;
    notes: string | null;
  },
  request: {
    agentId: string;
    amount: number;
    notes: string | null;
  },
): boolean {
  return record.agentId === request.agentId &&
    record.amount === request.amount &&
    record.paymentType === "card" &&
    record.notes === request.notes;
}

function cardReplayResponse(
  record: {
    agentId: string;
    amount: number;
    paymentType: string;
    notes: string | null;
  },
  request: {
    agentId: string;
    amount: number;
    notes: string | null;
  },
): NextResponse {
  if (!isMatchingCardPayment(record, request)) {
    return NextResponse.json(
      { error: "Operation ID was already used for a different payment" },
      { status: 409 },
    );
  }

  return NextResponse.json({ paymentRecord: record });
}

function isMatchingOfflinePayment(
  record: {
    agentId: string;
    amount: number;
    paymentType: string;
    notes: string | null;
  },
  request: {
    agentId: string;
    amount: number;
    paymentType: "cash" | "check";
    notes: string | null;
  },
): boolean {
  return record.agentId === request.agentId &&
    record.amount === request.amount &&
    record.paymentType === request.paymentType &&
    record.notes === request.notes;
}

function offlineReplayResponse(
  record: {
    agentId: string;
    amount: number;
    paymentType: string;
    notes: string | null;
  },
  request: {
    agentId: string;
    amount: number;
    paymentType: "cash" | "check";
    notes: string | null;
  },
): NextResponse {
  if (!isMatchingOfflinePayment(record, request)) {
    return NextResponse.json(
      { error: "Operation ID was already used for a different payment" },
      { status: 409 },
    );
  }

  return NextResponse.json({ paymentRecord: record });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await params;

  const agent = await prisma.agent.findUnique({ where: { id } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await readJsonBodyWithLimit(request, 5_000);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;

  // Flow A: Card/ACH payment (has paymentMethodId)
  if (raw.paymentMethodId) {
    const parsed = adminProcessCardPaymentSchema.safeParse({
      ...raw,
      agentId: id,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { amount, paymentMethodId, description, operationId } = parsed.data;
    const recordId = operationRecordId(id, operationId);
    const expectedPayment = {
      agentId: id,
      amount,
      notes: description ?? null,
    };

    try {
      const existingRecord = await prisma.paymentRecord.findUnique({
        where: { id: recordId },
      });
      if (existingRecord) {
        return cardReplayResponse(existingRecord, expectedPayment);
      }

      const customerId = await getOrCreateStripeCustomer(id);

      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount,
          currency: "usd",
          customer: customerId,
          payment_method: paymentMethodId,
          confirm: true,
          description: description ?? `Admin payment for agent ${id}`,
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: "never",
          },
        },
        { idempotencyKey: `admin-payment:${id}:${operationId}` },
      );

      let record;
      try {
        record = await prisma.paymentRecord.create({
          data: {
            id: recordId,
            agentId: id,
            stripePaymentIntentId: paymentIntent.id,
            amount,
            currency: "usd",
            paymentType: "card",
            status: paymentIntent.status,
            processedBy: auth.user.id,
            notes: description ?? null,
          },
        });
      } catch (error) {
        if (!isUniqueConflict(error)) throw error;
        record = await prisma.paymentRecord.findUnique({ where: { id: recordId } });
        if (!record) throw error;
        return cardReplayResponse(record, expectedPayment);
      }

      return NextResponse.json({ paymentRecord: record }, { status: 201 });
    } catch (err) {
      logApiError("admin/billing/payment", err);
      return NextResponse.json(
        { error: "Payment failed" },
        { status: 500 },
      );
    }
  }

  // Flow B: Offline payment (cash/check)
  const parsed = adminRecordOfflinePaymentSchema.safeParse({
    ...raw,
    agentId: id,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { amount, paymentType, notes, operationId } = parsed.data;
  const recordId = operationRecordId(id, operationId);
  const normalizedNotes = normalizeOfflineNotes(notes);
  const expectedPayment = {
    agentId: id,
    amount,
    paymentType,
    notes: normalizedNotes,
  };

  try {
    const existingRecord = await prisma.paymentRecord.findUnique({
      where: { id: recordId },
    });
    if (existingRecord) {
      return offlineReplayResponse(existingRecord, expectedPayment);
    }

    try {
      const record = await prisma.paymentRecord.create({
        data: {
          id: recordId,
          agentId: id,
          amount,
          currency: "usd",
          paymentType,
          status: "succeeded",
          processedBy: auth.user.id,
          notes: normalizedNotes,
        },
      });

      return NextResponse.json({ paymentRecord: record }, { status: 201 });
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
      const replay = await prisma.paymentRecord.findUnique({ where: { id: recordId } });
      if (!replay) throw error;
      return offlineReplayResponse(replay, expectedPayment);
    }
  } catch (error) {
    logApiError("admin/billing/offline-payment", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
