import type { Redirect } from "next/dist/lib/load-custom-routes";

export const OLD_SITE_REDIRECTS: Redirect[] = [
  // ── iHomefinder IDX / Listing Paths ──
  { source: "/idx/:path*", destination: "/properties", permanent: true },
  { source: "/listing/:path*", destination: "/properties", permanent: true },
  { source: "/listings", destination: "/properties", permanent: true },
  { source: "/listings/:path*", destination: "/properties", permanent: true },
  { source: "/realestatehomes/:path*", destination: "/properties", permanent: true },
  { source: "/search/:path*", destination: "/properties", permanent: true },
  { source: "/featured", destination: "/properties", permanent: true },
  { source: "/featured-properties", destination: "/properties", permanent: true },
  { source: "/advanced-search", destination: "/properties", permanent: true },
  { source: "/map-search", destination: "/properties", permanent: true },

  // ── Agent / Contact Variants ──
  { source: "/our-agents", destination: "/agents", permanent: true },
  { source: "/our-agents/:slug", destination: "/agents/:slug", permanent: true },
  { source: "/our-team", destination: "/agents", permanent: true },
  { source: "/team", destination: "/agents", permanent: true },
  { source: "/RealtorWebPage", destination: "/about", permanent: true },
  { source: "/AgentResources", destination: "/agents", permanent: true },
  { source: "/agent-resources", destination: "/agents", permanent: true },
  { source: "/contact", destination: "/about#contact", permanent: true },
  { source: "/contact-us", destination: "/about#contact", permanent: true },
  { source: "/Contact-Us", destination: "/about#contact", permanent: true },

  // ── Buyer / Seller Content Paths ──
  { source: "/buyers-guide", destination: "/buyers", permanent: true },
  { source: "/buyer-resources", destination: "/buyers", permanent: true },
  { source: "/seller-resources", destination: "/sellers", permanent: true },
  { source: "/sellers-guide", destination: "/sellers", permanent: true },
  { source: "/home-value", destination: "/home-evaluation", permanent: true },
  { source: "/home-valuation", destination: "/home-evaluation", permanent: true },
  { source: "/whats-my-home-worth", destination: "/home-evaluation", permanent: true },
  { source: "/cma", destination: "/home-evaluation", permanent: true },
  { source: "/free-market-analysis", destination: "/home-evaluation", permanent: true },

  // ── Community / Neighborhood Paths ──
  { source: "/communities/:slug/homes-for-sale", destination: "/communities/:slug", permanent: true },
  { source: "/neighborhoods", destination: "/communities", permanent: true },
  { source: "/neighborhoods/:path*", destination: "/communities", permanent: true },
  { source: "/areas-we-serve", destination: "/communities", permanent: true },
  { source: "/service-areas", destination: "/communities", permanent: true },

  // ── WordPress Content Paths (title-case originals) ──
  { source: "/Prepping-Your-Home", destination: "/sellers/staging", permanent: true },
  { source: "/Sell-Your-Home-FAST", destination: "/sellers/sell-fast", permanent: true },
  { source: "/Moving-Assistance", destination: "/buyers/moving-tips", permanent: true },
  { source: "/preparing-to-buy", destination: "/buyers/preparing", permanent: true },
  { source: "/sounds-and-smells", destination: "/sellers/sounds-and-smells", permanent: true },
  { source: "/home-inspection-tips", destination: "/buyers/home-inspection", permanent: true },
  { source: "/first-time-buyers", destination: "/buyers/preparing", permanent: true },
  { source: "/condo-vs-house", destination: "/buyers/condo-vs-house", permanent: true },

  // ── Blog / Category / Tag Paths ──
  { source: "/blog/:path*", destination: "/", permanent: true },
  { source: "/category/:path*", destination: "/", permanent: true },
  { source: "/tag/:path*", destination: "/", permanent: true },
  { source: "/news/:path*", destination: "/", permanent: true },

  // ── Misc WordPress / CMS Paths ──
  { source: "/wp-content/:path*", destination: "/", permanent: true },
  { source: "/wp-admin/:path*", destination: "/", permanent: true },
  { source: "/feed", destination: "/", permanent: true },
  { source: "/sitemap.html", destination: "/sitemap.xml", permanent: true },

  // ── About Variants ──
  { source: "/about-us", destination: "/about", permanent: true },
  { source: "/About-Us", destination: "/about", permanent: true },

  // ── Property Alerts ──
  { source: "/saved-searches", destination: "/property-updates", permanent: true },
  { source: "/email-alerts", destination: "/property-updates", permanent: true },
  { source: "/market-reports", destination: "/property-updates", permanent: true },
];
