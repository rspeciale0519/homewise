/**
 * Display metadata for the Admin Jobs dashboard.
 * Keyed by the Inngest function ID (must match id: in createFunction config).
 * This file has no server-only imports and is safe for client components.
 */
export interface JobMeta {
  name: string;
  description: string;
  schedule: string | null;
  type: "cron" | "event";
}

export const JOB_REGISTRY: Record<string, JobMeta> = {
  "mls-sync": {
    name: "MLS Sync",
    description: "Sync listings from Stellar MLS",
    schedule: "Every 15 min",
    type: "cron",
  },
  "lead-scoring-cron": {
    name: "Lead Scoring",
    description: "Recalculate lead scores based on activity",
    schedule: "Daily at 2 AM",
    type: "cron",
  },
  "process-drip-campaigns": {
    name: "Drip Campaigns",
    description: "Send scheduled campaign emails to enrolled contacts",
    schedule: "Every 10 min",
    type: "cron",
  },
  "auto-enroll-campaign": {
    name: "Campaign Auto-Enroll",
    description: "Enroll new contacts in matching drip campaigns",
    schedule: null,
    type: "event",
  },
  "daily-birthday-check": {
    name: "Birthday & Anniversary",
    description: "Send birthday and close anniversary emails",
    schedule: "Daily at 9 AM",
    type: "cron",
  },
  "daily-listing-alerts": {
    name: "Listing Alerts",
    description: "Notify subscribers of new matching listings",
    schedule: "Daily at 8 AM",
    type: "cron",
  },
  "price-change-alert": {
    name: "Price Change Alert",
    description: "Notify subscribers when a listing price changes",
    schedule: null,
    type: "event",
  },
  "smart-listing-alerts": {
    name: "Smart Alerts",
    description: "AI-enhanced property match notifications",
    schedule: "Daily at 9 AM",
    type: "cron",
  },
  "daily-market-stats": {
    name: "Market Stats",
    description: "Aggregate market statistics by area",
    schedule: "Daily at 4 AM",
    type: "cron",
  },
  "monthly-market-email": {
    name: "Monthly Market Email",
    description: "Send monthly market reports to subscribers",
    schedule: "1st of month, 8 AM",
    type: "cron",
  },
  "generate-seo-content": {
    name: "SEO Content Generator",
    description: "AI-generate neighborhood guides and market content",
    schedule: "1st of month, 3 AM",
    type: "cron",
  },
  "generate-listing-embeddings": {
    name: "Listing Embeddings",
    description: "Create vector embeddings for new listings",
    schedule: "Every 6 hours",
    type: "cron",
  },
  "generate-single-embedding": {
    name: "Single Embedding",
    description: "Generate embedding for a listing on sync",
    schedule: null,
    type: "event",
  },
  "process-behavioral-trigger": {
    name: "Behavioral Triggers",
    description: "Process automation rules on contact activity",
    schedule: null,
    type: "event",
  },
};
