import { PrismaClient } from "@prisma/client";
import { MOCK_AGENTS } from "../archive/data-mock-agents";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding agents...");

  for (const agent of MOCK_AGENTS) {
    await prisma.agent.upsert({
      where: { slug: agent.slug },
      update: {
        firstName: agent.firstName,
        lastName: agent.lastName,
        email: agent.email,
        phone: agent.phone,
        photoUrl: agent.photoUrl,
        languages: agent.languages,
        designations: agent.designations,
        bio: agent.bio,
        active: agent.active,
      },
      create: {
        firstName: agent.firstName,
        lastName: agent.lastName,
        slug: agent.slug,
        email: agent.email,
        phone: agent.phone,
        photoUrl: agent.photoUrl,
        languages: agent.languages,
        designations: agent.designations,
        bio: agent.bio,
        active: agent.active,
      },
    });
    console.log(`  Upserted: ${agent.firstName} ${agent.lastName}`);
  }

  console.log(`Seeded ${MOCK_AGENTS.length} agents.`);

  console.log("Seeding AI feature configs...");
  const AI_FEATURE_CONFIGS = [
    { featureKey: "public_chatbot",        label: "Public Site Chatbot",      model: "claude-sonnet-4-20250514", tier: "1" },
    { featureKey: "agent_website_chatbot", label: "Agent Website Chatbot",    model: "claude-sonnet-4-20250514", tier: "1" },
    { featureKey: "dashboard_chatbot",     label: "Dashboard Assistant",      model: "gpt-5-mini",               tier: "2" },
    { featureKey: "cma_report",            label: "CMA Report Generator",     model: "gpt-5-mini",               tier: "2" },
    { featureKey: "campaign_generator",    label: "Campaign Generator",       model: "gpt-5-mini",               tier: "2" },
    { featureKey: "listing_description",   label: "Listing Description",      model: "gpt-5-mini",               tier: "2" },
    { featureKey: "meeting_prep",          label: "Meeting Prep Brief",       model: "gpt-5-mini",               tier: "2" },
    { featureKey: "mortgage_advisor",      label: "Mortgage Advisor",         model: "gpt-5-mini",               tier: "2" },
    { featureKey: "home_valuation",        label: "Home Valuation",           model: "gpt-5-mini",               tier: "2" },
    { featureKey: "social_post",           label: "Social Post Generator",    model: "gpt-5-mini",               tier: "2" },
    { featureKey: "follow_up_draft",       label: "Follow-Up Draft",          model: "gpt-5-mini",               tier: "2" },
    { featureKey: "market_insights",       label: "Market Insights",          model: "gpt-5-nano",               tier: "3" },
    { featureKey: "lead_scoring",          label: "Lead Scoring",             model: "gpt-5-nano",               tier: "3" },
    { featureKey: "listing_insights",      label: "Listing Insights",         model: "gpt-5-nano",               tier: "3" },
  ] as const;

  for (const config of AI_FEATURE_CONFIGS) {
    await prisma.aiFeatureConfig.upsert({
      where: { featureKey: config.featureKey },
      update: { label: config.label, model: config.model, tier: config.tier },
      create: config,
    });
  }
  console.log(`Seeded ${AI_FEATURE_CONFIGS.length} AI feature configs.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
