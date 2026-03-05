import { mlsSync } from "./mls-sync";
import { leadScoringCron } from "./lead-scoring-cron";
import { processDripCampaigns, autoEnrollCampaign } from "./drip-campaign";
import { dailyBirthdayCheck } from "./birthday-automations";
import { dailyListingAlerts } from "./listing-alerts";
import { priceChangeAlert } from "./price-change-alerts";
import { smartListingAlerts } from "./smart-alerts";
import { dailyMarketStatsAggregation } from "./market-stats-aggregation";
import { monthlyMarketEmail } from "./monthly-market-email";
import { generateSeoContent } from "./seo-content-generator";
import { generateListingEmbeddings, generateSingleEmbedding } from "./generate-embeddings";
import { processBehavioralTrigger } from "./behavioral-triggers";

export const ALL_INNGEST_FUNCTIONS = [
  mlsSync,
  leadScoringCron,
  processDripCampaigns,
  autoEnrollCampaign,
  dailyBirthdayCheck,
  dailyListingAlerts,
  priceChangeAlert,
  smartListingAlerts,
  dailyMarketStatsAggregation,
  monthlyMarketEmail,
  generateSeoContent,
  generateListingEmbeddings,
  generateSingleEmbedding,
  processBehavioralTrigger,
];
