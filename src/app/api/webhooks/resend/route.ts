import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import {
  InvalidTextBodyError,
  readTextBodyWithLimit,
  RequestBodyTooLargeError,
} from "@/lib/http/request-body";
import { verifyResendWebhook } from "@/lib/email";

const MAX_WEBHOOK_BYTES = 128 * 1024;

const resendWebhookPayloadSchema = z
  .object({
    type: z.string().min(1).max(100),
    data: z
      .object({
        email_id: z.string().min(1).max(200).optional(),
        to: z.array(z.string().min(1).max(320)).max(50).optional(),
        subject: z.string().max(1_000).optional(),
        tags: z
          .record(z.string().min(1).max(100), z.string().max(500))
          .refine((tags) => Object.keys(tags).length <= 50)
          .optional(),
        created_at: z.string().max(100).optional(),
      })
      .passthrough(),
  })
  .passthrough();

const behavioralDispatchTargetSchema = z.object({
  contactId: z.string().min(1),
  ruleId: z.string().min(1),
  triggerType: z.string().min(1),
});

const storedEmailMetadataSchema = z
  .object({
    homewiseBehavioralDispatch: z.object({
      version: z.literal(1),
      targets: z.array(behavioralDispatchTargetSchema),
    }),
  })
  .passthrough();

type BehavioralDispatchTarget = z.infer<typeof behavioralDispatchTargetSchema>;

function deterministicId(prefix: string, ...parts: string[]): string {
  const digest = createHash("sha256").update(parts.join("\0")).digest("hex");
  return `${prefix}_${digest}`;
}

function isBoundedHeader(value: string, maxLength: number): boolean {
  return value.length > 0 && value.length <= maxLength;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function behavioralEvents(
  emailEventId: string,
  targets: BehavioralDispatchTarget[],
) {
  return targets.map((target) => ({
    id: deterministicId("resend_behavior", emailEventId, target.ruleId),
    name: "crm/behavioral.trigger" as const,
    data: target,
  }));
}

function storedEmailMetadata(
  data: z.infer<typeof resendWebhookPayloadSchema>["data"],
  targets: BehavioralDispatchTarget[],
) {
  const serializedData = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
  return {
    ...serializedData,
    homewiseBehavioralDispatch: { version: 1 as const, targets },
  };
}

function storedBehavioralEvents(emailEventId: string, metadata: unknown) {
  const parsed = storedEmailMetadataSchema.safeParse(metadata);
  return parsed.success
    ? behavioralEvents(emailEventId, parsed.data.homewiseBehavioralDispatch.targets)
    : [];
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook/resend] RESEND_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const svixId = request.headers.get("svix-id") ?? "";
  const svixTimestamp = request.headers.get("svix-timestamp") ?? "";
  const svixSignature = request.headers.get("svix-signature") ?? "";

  if (
    !isBoundedHeader(svixId, 200) ||
    !isBoundedHeader(svixTimestamp, 100) ||
    !isBoundedHeader(svixSignature, 2_000)
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: string;
  try {
    body = await readTextBodyWithLimit(request, MAX_WEBHOOK_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request body is too large" }, { status: 413 });
    }
    if (error instanceof InvalidTextBodyError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    throw error;
  }

  let verifiedPayload: unknown;
  try {
    verifiedPayload = verifyResendWebhook({
      payload: body,
      headers: {
        id: svixId,
        timestamp: svixTimestamp,
        signature: svixSignature,
      },
      webhookSecret,
    });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const parsedPayload = resendWebhookPayloadSchema.safeParse(verifiedPayload);
  if (!parsedPayload.success) {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  try {
    const payload = parsedPayload.data;
    const { type, data } = payload;
    const emailEventId = deterministicId("resend", svixId);

    const emailAddress = data.to?.[0] ?? "";
    const messageId = data.email_id ?? null;
    const tags = data.tags ?? {};
    const campaignId = tags.campaign_id ?? null;
    const variant = tags.variant ?? null;

    let pendingBehaviorEvents: ReturnType<typeof behavioralEvents>;
    try {
      pendingBehaviorEvents = await prisma.$transaction(async (tx) => {
        // Insert first so duplicate deliveries fail before mutable CRM lookups.
        await tx.emailEvent.create({
          data: {
            id: emailEventId,
            contactId: null,
            emailAddress,
            messageId,
            type,
            subject: data.subject ?? null,
            campaignId,
            variant,
            metadata: storedEmailMetadata(data, []),
          },
        });

        const contact = emailAddress
          ? await tx.contact.findUnique({
              where: { email: emailAddress },
              select: { id: true },
            })
          : null;
        const rules = contact && (type === "email.opened" || type === "email.clicked")
          ? await tx.automationRule.findMany({
              where: { triggerType: type, active: true },
              select: { id: true },
            })
          : [];
        const dispatchTargets = contact
          ? rules.map((rule) => ({
              contactId: contact.id,
              ruleId: rule.id,
              triggerType: type,
            }))
          : [];

        await tx.emailEvent.update({
          where: { id: emailEventId },
          data: {
            contactId: contact?.id ?? null,
            metadata: storedEmailMetadata(data, dispatchTargets),
          },
        });

        if (type === "email.opened" && contact) {
          await tx.contact.update({
            where: { id: contact.id },
            data: { score: { increment: 2 } },
          });
        }

        if (type === "email.clicked" && contact) {
          await tx.contact.update({
            where: { id: contact.id },
            data: { score: { increment: 5 } },
          });
        }

        if (variant && campaignId) {
          if (type === "email.opened") {
            await tx.subjectLineVariant.updateMany({
              where: { campaignEmailId: campaignId, variant },
              data: { openCount: { increment: 1 } },
            });
          }
          if (type === "email.clicked") {
            await tx.subjectLineVariant.updateMany({
              where: { campaignEmailId: campaignId, variant },
              data: { clickCount: { increment: 1 } },
            });
          }
        }

        return behavioralEvents(emailEventId, dispatchTargets);
      });
    } catch (err) {
      if (!isUniqueConstraintError(err)) throw err;

      const storedEvent = await prisma.emailEvent.findUnique({
        where: { id: emailEventId },
        select: { metadata: true },
      });
      if (!storedEvent) throw err;

      pendingBehaviorEvents = storedBehavioralEvents(
        emailEventId,
        storedEvent.metadata,
      );

      if (pendingBehaviorEvents.length > 0) {
        await inngest.send(pendingBehaviorEvents);
      }
      return NextResponse.json({ received: true, duplicate: true });
    }

    if (pendingBehaviorEvents.length > 0) {
      await inngest.send(pendingBehaviorEvents);
    }

    return NextResponse.json({ received: true });
  } catch {
    console.error("[webhook/resend] processing failed");
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
