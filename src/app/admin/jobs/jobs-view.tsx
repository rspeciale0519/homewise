"use client";

interface JobInfo {
  id: string;
  name: string;
  description: string;
  schedule: string | null;
  type: "cron" | "event";
}

const INNGEST_FUNCTIONS: JobInfo[] = [
  { id: "mls-sync", name: "MLS Sync", description: "Sync listings from Stellar MLS", schedule: "Every 4 hours", type: "cron" },
  { id: "lead-scoring-cron", name: "Lead Scoring", description: "Recalculate lead scores based on activity", schedule: "Every 6 hours", type: "cron" },
  { id: "drip-campaign", name: "Drip Campaigns", description: "Send scheduled campaign emails to enrolled contacts", schedule: "Every 15 minutes", type: "cron" },
  { id: "birthday-automations", name: "Birthday & Anniversary", description: "Send birthday and close anniversary emails", schedule: "Daily at 9 AM", type: "cron" },
  { id: "listing-alerts", name: "Listing Alerts", description: "Notify subscribers of new matching listings", schedule: "Every 30 minutes", type: "cron" },
  { id: "price-change-alerts", name: "Price Change Alerts", description: "Notify subscribers of price changes", schedule: "Every hour", type: "cron" },
  { id: "smart-alerts", name: "Smart Alerts", description: "AI-enhanced property match notifications", schedule: "Every 2 hours", type: "cron" },
  { id: "market-stats-aggregation", name: "Market Stats", description: "Aggregate market statistics by area", schedule: "Daily at 2 AM", type: "cron" },
  { id: "monthly-market-email", name: "Monthly Market Email", description: "Send monthly market reports to subscribers", schedule: "1st of month", type: "cron" },
  { id: "seo-content-generator", name: "SEO Content Generator", description: "AI-generate neighborhood guides and market content", schedule: "Weekly", type: "cron" },
  { id: "generate-embeddings", name: "Generate Embeddings", description: "Create search embeddings for new listings", schedule: null, type: "event" },
  { id: "behavioral-triggers", name: "Behavioral Triggers", description: "Process automation rules on contact activity", schedule: null, type: "event" },
];

export function JobsView() {
  const cronJobs = INNGEST_FUNCTIONS.filter((j) => j.type === "cron");
  const eventJobs = INNGEST_FUNCTIONS.filter((j) => j.type === "event");

  return (
    <div className="space-y-6">
      {/* Scheduled Jobs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-navy-700">Scheduled Jobs</h2>
          <p className="text-xs text-slate-400">Cron-based jobs that run on a fixed schedule</p>
        </div>
        <div className="divide-y divide-slate-100">
          {cronJobs.map((job) => (
            <div key={job.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/50">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                  <p className="text-sm font-medium text-navy-700">{job.name}</p>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 ml-4">{job.description}</p>
              </div>
              <span className="text-xs text-slate-400 shrink-0 ml-4">{job.schedule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Event-Driven Jobs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-navy-700">Event-Driven Jobs</h2>
          <p className="text-xs text-slate-400">Triggered by user actions and system events</p>
        </div>
        <div className="divide-y divide-slate-100">
          {eventJobs.map((job) => (
            <div key={job.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/50">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                  <p className="text-sm font-medium text-navy-700">{job.name}</p>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 ml-4">{job.description}</p>
              </div>
              <span className="text-xs text-slate-400 shrink-0 ml-4">On event</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
        <p className="text-xs text-slate-500">
          Jobs are managed by Inngest. For detailed run history, errors, and replay capabilities, visit the{" "}
          <a href="https://app.inngest.com" target="_blank" rel="noopener noreferrer" className="text-navy-600 hover:underline">
            Inngest Dashboard
          </a>.
        </p>
      </div>
    </div>
  );
}
