import Link from "next/link";
import { YlsPill } from "../_components/yls-pill";

const VALID_WORKFLOWS = ["just-sold", "just-listed", "farm", "browse"] as const;
type Workflow = (typeof VALID_WORKFLOWS)[number];

export default async function NewMailOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ workflow?: string }>;
}) {
  const params = await searchParams;
  const workflow: Workflow = (VALID_WORKFLOWS as readonly string[]).includes(params.workflow ?? "")
    ? (params.workflow as Workflow)
    : "browse";

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-4xl">
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <Link
            href="/dashboard/direct-mail"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-crimson-600 mb-2"
          >
            ← Direct Mail
          </Link>
          <h1 className="font-serif text-display-sm sm:text-display-md text-navy-700">
            {workflowTitle(workflow)}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{workflowSubtitle(workflow)}</p>
        </div>
        <YlsPill />
      </div>

      <div className="rounded-2xl bg-white border border-dashed border-slate-200 p-10 text-center">
        <p className="text-sm text-slate-500">
          The order wizard is coming in Phase 2. Workflow: <span className="font-mono">{workflow}</span>.
        </p>
      </div>
    </div>
  );
}

function workflowTitle(w: Workflow): string {
  switch (w) {
    case "just-sold":
      return "New Just Sold campaign";
    case "just-listed":
      return "New Just Listed campaign";
    case "farm":
      return "New Farm campaign";
    case "browse":
      return "New direct mail order";
  }
}

function workflowSubtitle(w: Workflow): string {
  switch (w) {
    case "just-sold":
      return "Announce a recent close to the surrounding neighborhood.";
    case "just-listed":
      return "Promote a new listing to nearby prospects.";
    case "farm":
      return "Recurring outreach to a neighborhood you're farming.";
    case "browse":
      return "Custom postcard, letter, snap pack, EDDM, or door hanger.";
  }
}
