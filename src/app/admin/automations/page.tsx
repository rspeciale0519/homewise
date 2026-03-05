import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { AutomationListView } from "./automation-list-view";

export const metadata: Metadata = { title: "Automations — Admin" };

const TRIGGER_TYPES = [
  { value: "listing_saved", label: "Listing Saved" },
  { value: "listing_view", label: "Listing Viewed" },
  { value: "search_performed", label: "Search Performed" },
  { value: "form_submission", label: "Form Submitted" },
  { value: "email.opened", label: "Email Opened" },
  { value: "email.clicked", label: "Email Link Clicked" },
  { value: "inactive_30d", label: "30 Days Inactive" },
  { value: "stage_change", label: "Stage Changed" },
];

const ACTION_TYPES = [
  { value: "send_email", label: "Send Email" },
  { value: "enroll_campaign", label: "Enroll in Campaign" },
  { value: "add_tag", label: "Add Tag" },
  { value: "update_score", label: "Update Lead Score" },
];

export default async function AutomationsPage() {
  const rules = await prisma.automationRule.findMany({
    orderBy: { createdAt: "desc" },
  });

  const serialized = rules.map((r) => ({
    ...r,
    conditions: r.conditions as Record<string, unknown>,
    actionData: r.actionData as Record<string, unknown>,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-700">Automations</h1>
        <p className="text-sm text-slate-500">Behavioral trigger rules: condition → action</p>
      </div>
      <AutomationListView rules={serialized} triggerTypes={TRIGGER_TYPES} actionTypes={ACTION_TYPES} />
    </div>
  );
}
