// Seed data definitions for billing: products, entitlements, and bundle-feature assignments.

export interface ProductDef {
  slug: string;
  name: string;
  description: string;
  productType: string;
  monthlyAmount: number;
  annualAmount: number;
  hasMonthly: boolean;
  hasAnnual: boolean;
  sortOrder: number;
}

export const PRODUCTS: ProductDef[] = [
  {
    slug: "annual_brokerage_membership",
    name: "Annual Brokerage Membership",
    description: "Full brokerage membership with access to all core platform features.",
    productType: "membership",
    monthlyAmount: 0,
    annualAmount: 49900,
    hasMonthly: false,
    hasAnnual: true,
    sortOrder: 0,
  },
  {
    slug: "ai_power_tools",
    name: "AI Power Tools",
    description: "Advanced AI-powered tools for CMA reports, lead scoring, listing descriptions, and more.",
    productType: "ai_power_tools",
    monthlyAmount: 4900,
    annualAmount: 49900,
    hasMonthly: true,
    hasAnnual: true,
    sortOrder: 1,
  },
  {
    slug: "marketing_suite",
    name: "Marketing Suite",
    description: "Full marketing automation including drip campaigns, A/B testing, SMS, and broadcast emails.",
    productType: "marketing_suite",
    monthlyAmount: 6900,
    annualAmount: 69900,
    hasMonthly: true,
    hasAnnual: true,
    sortOrder: 2,
  },
  {
    slug: "growth_engine",
    name: "Growth Engine",
    description: "Team collaboration, advanced analytics, priority lead routing, and API access.",
    productType: "growth_engine",
    monthlyAmount: 9900,
    annualAmount: 99900,
    hasMonthly: true,
    hasAnnual: true,
    sortOrder: 3,
  },
  {
    slug: "extra_ai_credits",
    name: "Extra AI Credits Pack",
    description: "Additional AI usage credits for high-volume agents.",
    productType: "add_on",
    monthlyAmount: 1900,
    annualAmount: 0,
    hasMonthly: true,
    hasAnnual: false,
    sortOrder: 4,
  },
  {
    slug: "advanced_training_library",
    name: "Advanced Training Library",
    description: "Expanded training content library with premium courses and certifications.",
    productType: "add_on",
    monthlyAmount: 1500,
    annualAmount: 0,
    hasMonthly: true,
    hasAnnual: false,
    sortOrder: 5,
  },
  {
    slug: "property_alerts_pack",
    name: "Property Alerts (50 pack)",
    description: "50-pack of property alert slots for high-volume client management.",
    productType: "add_on",
    monthlyAmount: 900,
    annualAmount: 0,
    hasMonthly: true,
    hasAnnual: false,
    sortOrder: 6,
  },
  {
    slug: "white_label_cma_reports",
    name: "White-Label CMA Reports",
    description: "Branded CMA reports with your logo and custom colors.",
    productType: "add_on",
    monthlyAmount: 2900,
    annualAmount: 0,
    hasMonthly: true,
    hasAnnual: false,
    sortOrder: 7,
  },
];

export interface EntitlementDef {
  featureKey: string;
  featureName: string;
  requiredProduct: string | null;
  freeLimit: number | null;
  description: string;
}

export const ENTITLEMENTS: EntitlementDef[] = [
  // AI Power Tools features
  {
    featureKey: "ai_cma_reports",
    featureName: "AI CMA Reports",
    requiredProduct: "ai_power_tools",
    freeLimit: 5,
    description: "AI-generated Comparative Market Analysis reports.",
  },
  {
    featureKey: "ai_lead_scoring",
    featureName: "AI Lead Scoring",
    requiredProduct: "ai_power_tools",
    freeLimit: null,
    description: "Basic AI lead scoring is free; advanced scoring requires AI Power Tools.",
  },
  {
    featureKey: "ai_listing_descriptions",
    featureName: "AI Listing Descriptions",
    requiredProduct: "ai_power_tools",
    freeLimit: null,
    description: "Basic AI listing descriptions free; enhanced requires AI Power Tools.",
  },
  {
    featureKey: "ai_social_posts",
    featureName: "AI Social Post Creator",
    requiredProduct: "ai_power_tools",
    freeLimit: null,
    description: "Generate social media posts for listings using AI.",
  },
  {
    featureKey: "ai_meeting_prep",
    featureName: "AI Meeting Prep",
    requiredProduct: "ai_power_tools",
    freeLimit: null,
    description: "AI-generated meeting preparation briefs.",
  },
  {
    featureKey: "ai_follow_up_drafts",
    featureName: "AI Follow-Up Drafts",
    requiredProduct: "ai_power_tools",
    freeLimit: null,
    description: "AI-drafted follow-up messages for leads and clients.",
  },
  {
    featureKey: "ai_email_content",
    featureName: "AI Email Content",
    requiredProduct: "ai_power_tools",
    freeLimit: null,
    description: "AI-generated email content for campaigns and outreach.",
  },
  // Marketing Suite features
  {
    featureKey: "campaign_builder",
    featureName: "Campaign Builder",
    requiredProduct: "marketing_suite",
    freeLimit: null,
    description: "Visual drip campaign builder with templates.",
  },
  {
    featureKey: "drip_sequences",
    featureName: "Drip Sequences",
    requiredProduct: "marketing_suite",
    freeLimit: null,
    description: "Automated drip email sequences for lead nurturing.",
  },
  {
    featureKey: "ab_subject_testing",
    featureName: "A/B Subject Line Testing",
    requiredProduct: "marketing_suite",
    freeLimit: null,
    description: "Split test email subject lines to improve open rates.",
  },
  {
    featureKey: "broadcast_emails",
    featureName: "Broadcast Emails",
    requiredProduct: "marketing_suite",
    freeLimit: null,
    description: "Send bulk broadcast emails to segmented audiences.",
  },
  {
    featureKey: "email_analytics",
    featureName: "Email Analytics",
    requiredProduct: "marketing_suite",
    freeLimit: null,
    description: "Detailed open, click, and conversion analytics for emails.",
  },
  {
    featureKey: "automation_triggers",
    featureName: "Behavioral Triggers",
    requiredProduct: "marketing_suite",
    freeLimit: null,
    description: "Trigger automated actions based on lead behavior.",
  },
  {
    featureKey: "sms_campaigns",
    featureName: "SMS Campaigns",
    requiredProduct: "marketing_suite",
    freeLimit: null,
    description: "Send SMS messages as part of campaign sequences.",
  },
  // Growth Engine features
  {
    featureKey: "priority_lead_routing",
    featureName: "Priority Lead Routing",
    requiredProduct: "growth_engine",
    freeLimit: null,
    description: "Advanced rule-based priority lead routing.",
  },
  {
    featureKey: "advanced_lead_scoring",
    featureName: "Advanced Lead Scoring Rules",
    requiredProduct: "growth_engine",
    freeLimit: null,
    description: "Custom scoring rules and weighted criteria for lead prioritization.",
  },
  {
    featureKey: "team_dashboards",
    featureName: "Team Dashboards",
    requiredProduct: "growth_engine",
    freeLimit: null,
    description: "Team performance dashboards with cross-agent visibility.",
  },
  {
    featureKey: "unlimited_transactions",
    featureName: "Unlimited Transactions",
    requiredProduct: "growth_engine",
    freeLimit: null,
    description: "Unlimited transaction tracking records.",
  },
  {
    featureKey: "performance_analytics",
    featureName: "Performance Analytics",
    requiredProduct: "growth_engine",
    freeLimit: null,
    description: "Advanced performance reporting and pipeline analytics.",
  },
  {
    featureKey: "api_access",
    featureName: "API Access",
    requiredProduct: "growth_engine",
    freeLimit: null,
    description: "REST API access for custom integrations.",
  },
  {
    featureKey: "white_label_cma",
    featureName: "White-Label CMA Reports",
    requiredProduct: "growth_engine",
    freeLimit: null,
    description: "Fully branded CMA reports with agent/brokerage logo.",
  },
  // Free-tier features with limits
  {
    featureKey: "crm_contacts",
    featureName: "CRM Contacts",
    requiredProduct: null,
    freeLimit: 50,
    description: "CRM contact records. Free tier limited to 50 contacts.",
  },
  {
    featureKey: "property_alerts",
    featureName: "Property Alerts",
    requiredProduct: null,
    freeLimit: 3,
    description: "Active property alert subscriptions for clients.",
  },
  {
    featureKey: "transaction_tracking",
    featureName: "Transaction Tracking",
    requiredProduct: null,
    freeLimit: 3,
    description: "Active transaction records. Free tier limited to 3.",
  },
  {
    featureKey: "training_library",
    featureName: "Training Library",
    requiredProduct: null,
    freeLimit: null,
    description: "Training content library. Required courses are free.",
  },
];

// Maps bundle slug → feature keys included at unlimited (limit: null)
export const BUNDLE_FEATURES: Record<string, string[]> = {
  ai_power_tools: [
    "ai_cma_reports",
    "ai_lead_scoring",
    "ai_listing_descriptions",
    "ai_social_posts",
    "ai_meeting_prep",
    "ai_follow_up_drafts",
    "ai_email_content",
  ],
  marketing_suite: [
    "campaign_builder",
    "drip_sequences",
    "ab_subject_testing",
    "broadcast_emails",
    "email_analytics",
    "automation_triggers",
    "sms_campaigns",
  ],
  growth_engine: [
    "priority_lead_routing",
    "advanced_lead_scoring",
    "team_dashboards",
    "unlimited_transactions",
    "performance_analytics",
    "api_access",
    "white_label_cma",
  ],
};
