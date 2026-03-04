"use client";

import { JOB_REGISTRY } from "@/inngest/job-registry";

export function JobsView() {
  const entries = Object.entries(JOB_REGISTRY).map(([id, meta]) => ({ id, ...meta }));
  const cronJobs = entries.filter((j) => j.type === "cron");
  const eventJobs = entries.filter((j) => j.type === "event");

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
