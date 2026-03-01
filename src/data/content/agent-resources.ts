export interface ResourceDocument {
  name: string;
  url: string;
  description?: string;
}

export interface ResourceCategory {
  title: string;
  documents: ResourceDocument[];
}

export const COMPANY_IDENTIFIERS = {
  hudNaid: "HMWISE0528",
  taxId: "20-5240528",
  dbprLicense: "CQ1026984",
  orraMlsId: "59994",
} as const;

export const QUICK_ACCESS_DOCUMENTS: ResourceDocument[] = [
  {
    name: "HW Transaction Checklist",
    url: "https://www.HomeWiseFL.com/briefcase/138877_1026202011324PM83421.pdf",
    description: "Complete checklist for every transaction",
  },
  {
    name: "HW Affiliated Business Disclosure",
    url: "https://www.HomeWiseFL.com/briefcase/138877_1026202012659PM30061.pdf",
    description: "Required affiliated business disclosure form",
  },
  {
    name: "HW Compliance Fee Form",
    url: "https://www.HomeWiseFL.com/briefcase/138877_218202663001AM57943.pdf",
    description: "Compliance fee documentation",
  },
  {
    name: "HW Buyers Disclosure",
    url: "https://www.HomeWiseFL.com/briefcase/138877_1026202012659PM21916.pdf",
    description: "Buyer disclosure form",
  },
  {
    name: "HW Mold Disclosure",
    url: "https://www.HomeWiseFL.com/briefcase/138877_10232020111522AM77066.pdf",
    description: "Florida mold disclosure requirement",
  },
];

export const OFFICE_FORMS: ResourceCategory[] = [
  {
    title: "Office Documents",
    documents: [
      {
        name: "Business Cards",
        url: "https://printrealtorbusinesscards.com/Home%20Wise%20Realty%20Group/BusinessCards",
        description: "Order your Home Wise branded business cards",
      },
      {
        name: "Home Wise Logo Download",
        url: "http://www.homewisefl.com/Doc.aspx?f=2295163&t=HomeWiselogojpegJPG",
        description: "Official company logo for marketing materials",
      },
      {
        name: "Letterhead Template",
        url: "https://www.HomeWiseFL.com/briefcase/138877_718201882610AM42293.docx",
        description: "Official branded letterhead (.docx)",
      },
      {
        name: "Fax Cover Sheet",
        url: "https://www.HomeWiseFL.com/briefcase/138877_821201812457PM59007.pdf",
        description: "Branded fax cover page",
      },
    ],
  },
  {
    title: "Transaction & Compliance",
    documents: [
      {
        name: "Transaction Checklist",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1026202011324PM83421.pdf",
        description: "Complete checklist for every transaction",
      },
      {
        name: "Affiliated Business Disclosure",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1026202012659PM30061.pdf",
        description: "Required affiliated business disclosure",
      },
      {
        name: "Mold Disclosure",
        url: "https://www.HomeWiseFL.com/briefcase/138877_10232020111522AM77066.pdf",
        description: "Florida mold disclosure requirement",
      },
      {
        name: "Referral Agreement",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1026202011508PM12325.pdf",
        description: "Agent-to-agent referral agreement",
      },
      {
        name: "Paid at Closing Form",
        url: "https://www.HomeWiseFL.com/briefcase/138877_54202213621PM57098.pdf",
        description: "Payment at closing documentation",
      },
      {
        name: "Compliance Fee Form",
        url: "https://www.HomeWiseFL.com/briefcase/138877_218202663001AM57943.pdf",
        description: "Compliance fee submission form",
      },
    ],
  },
];

export const LISTING_FORMS: ResourceCategory[] = [
  {
    title: "Data Entry Forms",
    documents: [
      {
        name: "Residential Data Entry Form",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1162026105118AM70652.pdf",
        description: "MLS data entry for residential properties",
      },
      {
        name: "Vacant Land Data Entry Form",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1162026105118AM25801.pdf",
        description: "MLS data entry for vacant land",
      },
      {
        name: "Rental Data Entry Form",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1162026105118AM32382.pdf",
        description: "MLS data entry for rental properties",
      },
      {
        name: "Income Listing Data Entry Form",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1162026104941AM61650.pdf",
        description: "MLS data entry for income properties",
      },
      {
        name: "Commercial Lease Data Entry Form",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1162026104941AM88935.pdf",
        description: "MLS data entry for commercial leases",
      },
      {
        name: "Commercial Sales Data Entry Form",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1162026104941AM45359.pdf",
        description: "MLS data entry for commercial sales",
      },
      {
        name: "Business Opportunity Data Entry Form",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1162026104941AM26220.pdf",
        description: "MLS data entry for business opportunities",
      },
      {
        name: "MLS Status Change Form",
        url: "https://www.HomeWiseFL.com/briefcase/138877_11122020122549PM52909.pdf",
        description: "Request MLS listing status changes",
      },
      {
        name: "Owner's Waiver of MLS Entry",
        url: "https://www.HomeWiseFL.com/briefcase/138877_10272020121544PM46670.pdf",
        description: "Waiver for owners opting out of MLS",
      },
    ],
  },
  {
    title: "Listing Agreements",
    documents: [
      {
        name: "Exclusive Right of Sale — Residential",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1162026114156AM54971.pdf",
        description: "Standard residential listing agreement",
      },
      {
        name: "Exclusive Right of Sale — Commercial",
        url: "https://www.HomeWiseFL.com/briefcase/138877_129202652413PM26987.pdf",
        description: "Commercial property listing agreement",
      },
      {
        name: "Exclusive Brokerage Listing Agreement",
        url: "https://www.HomeWiseFL.com/briefcase/138877_129202652413PM63692.pdf",
        description: "Non-exclusive brokerage agreement",
      },
      {
        name: "Exclusive Right to Lease — Residential",
        url: "https://www.HomeWiseFL.com/briefcase/138877_129202652413PM94709.pdf",
        description: "Residential lease listing agreement",
      },
      {
        name: "Exclusive Right to Lease — Commercial",
        url: "https://www.HomeWiseFL.com/briefcase/138877_129202652413PM31994.pdf",
        description: "Commercial lease listing agreement",
      },
      {
        name: "Compensation Agreement (Seller/Seller's Broker to Buyer's Broker)",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1162026114155AM94814.pdf",
        description: "Broker compensation terms",
      },
    ],
  },
  {
    title: "Property Disclosures",
    documents: [
      {
        name: "Seller's Property Disclosure — Residential",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1162026114157AM69392.pdf",
        description: "Standard residential seller disclosure",
      },
      {
        name: "Seller's Property Disclosure — Condominium",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1162026114156AM96677.pdf",
        description: "Condo-specific seller disclosure",
      },
      {
        name: "Vacant Land Disclosure",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1162026114157AM50253.pdf",
        description: "Vacant land seller disclosure",
      },
      {
        name: "Condominium Association Disclosure",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1162026114155AM67530.pdf",
        description: "Condo HOA disclosure requirements",
      },
      {
        name: "Home Owner's Association Disclosure",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1162026121646PM16948.pdf",
        description: "HOA disclosure requirements",
      },
      {
        name: "Sinkhole Disclosure",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1162026114157AM47116.pdf",
        description: "Florida sinkhole disclosure requirement",
      },
      {
        name: "Lead-Based Paint Disclosure",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1162026121039PM81210.pdf",
        description: "Federal lead paint disclosure (pre-1978)",
      },
      {
        name: "Lead-Based Paint Brochure",
        url: "https://www.HomeWiseFL.com/briefcase/138877_11152020113137AM74965.pdf",
        description: "EPA lead paint informational brochure",
      },
    ],
  },
  {
    title: "Addendums & Riders",
    documents: [
      {
        name: "Broker Relationship Disclosure",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1115202095134PM11043.pdf",
        description: "Required broker relationship disclosure",
      },
      {
        name: "Showing Agreement",
        url: "https://www.HomeWiseFL.com/briefcase/138877_11152020100406PM33607.pdf",
        description: "Property showing terms and agreement",
      },
      {
        name: "Licensee Disclosure of Personal Interest",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1115202095541PM94790.pdf",
        description: "When agent has personal interest in property",
      },
      {
        name: "Chinese/Defective Drywall Addendum",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1115202095134PM35487.pdf",
        description: "Defective drywall disclosure addendum",
      },
      {
        name: "Short Sale Contingency (Rider G)",
        url: "https://www.HomeWiseFL.com/briefcase/138877_11152020100209PM42193.pdf",
        description: "Short sale contingency rider",
      },
      {
        name: "Sign Installation Order",
        url: "https://signpostmanorlando.com/login",
        description: "Order yard signs via SignPost",
      },
    ],
  },
];

export const SALES_FORMS: ResourceCategory[] = [
  {
    title: "Contracts",
    documents: [
      {
        name: "Vacant Land Contract",
        url: "https://www.HomeWiseFL.com/briefcase/138877_10272020121956PM93259.pdf",
        description: "Purchase contract for vacant land",
      },
      {
        name: "Commercial Contract",
        url: "https://www.HomeWiseFL.com/briefcase/138877_10272020121956PM16115.pdf",
        description: "Purchase contract for commercial property",
      },
    ],
  },
  {
    title: "Disclosures & Addendums",
    documents: [
      {
        name: "Buyers Disclosure",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1026202012659PM21916.pdf",
        description: "Buyer disclosure form",
      },
      {
        name: "Lead-Based Paint Disclosure",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1162026121039PM81210.pdf",
        description: "Federal lead paint disclosure (pre-1978)",
      },
      {
        name: "Lead-Based Paint Brochure",
        url: "https://www.HomeWiseFL.com/briefcase/138877_11152020113137AM74965.pdf",
        description: "EPA lead paint informational brochure",
      },
      {
        name: "Home Owner's Association Disclosure",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1162026121646PM16948.pdf",
        description: "HOA disclosure requirements",
      },
      {
        name: "Condo Association Disclosure",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1115202094015PM22244.pdf",
        description: "Condo HOA disclosure form",
      },
      {
        name: "Condo Association Acknowledgement Form",
        url: "https://www.HomeWiseFL.com/briefcase/138877_717201844344PM10332.pdf",
        description: "Condo association acknowledgement",
      },
      {
        name: "Broker Relationship Disclosure",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1115202095134PM11043.pdf",
        description: "Required broker relationship disclosure",
      },
      {
        name: "Licensee Disclosure of Personal Interest (Rider AA)",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1115202095541PM94790.pdf",
        description: "When agent has personal interest in property",
      },
      {
        name: "Chinese/Defective Drywall Addendum",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1115202095134PM35487.pdf",
        description: "Defective drywall disclosure addendum",
      },
      {
        name: "COVID-19 Extension Addendum",
        url: "https://www.HomeWiseFL.com/briefcase/138877_11152020100822PM22846.pdf",
        description: "Contract extension due to COVID-19",
      },
    ],
  },
  {
    title: "Riders",
    documents: [
      {
        name: "Appraisal Contingency (Rider F)",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1115202094453PM88753.pdf",
        description: "Appraisal contingency rider for contracts",
      },
      {
        name: "Sale of Buyer's Property (Rider V)",
        url: "https://www.HomeWiseFL.com/briefcase/138877_1115202095306PM37073.pdf",
        description: "Contingent on buyer selling existing property",
      },
    ],
  },
];

export const FORM_CATEGORIES = [
  {
    title: "Office Forms",
    description: "Business cards, letterhead, transaction checklists, and compliance documents",
    href: "/agent-resources/office-forms",
    count: OFFICE_FORMS.reduce((acc, cat) => acc + cat.documents.length, 0),
    icon: "building" as const,
  },
  {
    title: "Listing Forms",
    description: "Data entry forms, listing agreements, property disclosures, and addendums",
    href: "/agent-resources/listing-forms",
    count: LISTING_FORMS.reduce((acc, cat) => acc + cat.documents.length, 0),
    icon: "clipboard" as const,
  },
  {
    title: "Sales Forms",
    description: "Purchase contracts, buyer disclosures, association forms, and riders",
    href: "/agent-resources/sales-forms",
    count: SALES_FORMS.reduce((acc, cat) => acc + cat.documents.length, 0),
    icon: "document" as const,
  },
] as const;
