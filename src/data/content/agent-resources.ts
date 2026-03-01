export interface ResourceDocument {
  name: string;
  url: string;
  description?: string;
  external?: boolean;
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
    url: "/documents/office/transaction-checklist.pdf",
    description: "Complete checklist for every transaction",
  },
  {
    name: "HW Affiliated Business Disclosure",
    url: "/documents/office/affiliated-business-disclosure.pdf",
    description: "Required affiliated business disclosure form",
  },
  {
    name: "HW Compliance Fee Form",
    url: "/documents/office/compliance-fee.pdf",
    description: "Compliance fee documentation",
  },
  {
    name: "HW Buyers Disclosure",
    url: "/documents/sales/buyers-disclosure.pdf",
    description: "Buyer disclosure form",
  },
  {
    name: "HW Mold Disclosure",
    url: "/documents/office/mold-disclosure.pdf",
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
        external: true,
      },
      {
        name: "Home Wise Logo Download",
        url: "http://www.homewisefl.com/Doc.aspx?f=2295163&t=HomeWiselogojpegJPG",
        description: "Official company logo for marketing materials",
        external: true,
      },
      {
        name: "Letterhead Template",
        url: "/documents/office/letterhead.docx",
        description: "Official branded letterhead (.docx)",
      },
      {
        name: "Fax Cover Sheet",
        url: "/documents/office/fax-cover-sheet.pdf",
        description: "Branded fax cover page",
      },
    ],
  },
  {
    title: "Transaction & Compliance",
    documents: [
      {
        name: "Transaction Checklist",
        url: "/documents/office/transaction-checklist.pdf",
        description: "Complete checklist for every transaction",
      },
      {
        name: "Affiliated Business Disclosure",
        url: "/documents/office/affiliated-business-disclosure.pdf",
        description: "Required affiliated business disclosure",
      },
      {
        name: "Mold Disclosure",
        url: "/documents/office/mold-disclosure.pdf",
        description: "Florida mold disclosure requirement",
      },
      {
        name: "Referral Agreement",
        url: "/documents/office/referral-agreement.pdf",
        description: "Agent-to-agent referral agreement",
      },
      {
        name: "Paid at Closing Form",
        url: "/documents/office/paid-at-closing.pdf",
        description: "Payment at closing documentation",
      },
      {
        name: "Compliance Fee Form",
        url: "/documents/office/compliance-fee.pdf",
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
        url: "/documents/listing/residential-data-entry.pdf",
        description: "MLS data entry for residential properties",
      },
      {
        name: "Vacant Land Data Entry Form",
        url: "/documents/listing/vacant-land-data-entry.pdf",
        description: "MLS data entry for vacant land",
      },
      {
        name: "Rental Data Entry Form",
        url: "/documents/listing/rental-data-entry.pdf",
        description: "MLS data entry for rental properties",
      },
      {
        name: "Income Listing Data Entry Form",
        url: "/documents/listing/income-listing-data-entry.pdf",
        description: "MLS data entry for income properties",
      },
      {
        name: "Commercial Lease Data Entry Form",
        url: "/documents/listing/commercial-lease-data-entry.pdf",
        description: "MLS data entry for commercial leases",
      },
      {
        name: "Commercial Sales Data Entry Form",
        url: "/documents/listing/commercial-sales-data-entry.pdf",
        description: "MLS data entry for commercial sales",
      },
      {
        name: "Business Opportunity Data Entry Form",
        url: "/documents/listing/business-opportunity-data-entry.pdf",
        description: "MLS data entry for business opportunities",
      },
      {
        name: "MLS Status Change Form",
        url: "/documents/listing/mls-status-change.pdf",
        description: "Request MLS listing status changes",
      },
      {
        name: "Owner's Waiver of MLS Entry",
        url: "/documents/listing/owners-waiver-mls-entry.pdf",
        description: "Waiver for owners opting out of MLS",
      },
    ],
  },
  {
    title: "Listing Agreements",
    documents: [
      {
        name: "Exclusive Right of Sale — Residential",
        url: "/documents/listing/exclusive-right-of-sale-residential.pdf",
        description: "Standard residential listing agreement",
      },
      {
        name: "Exclusive Right of Sale — Commercial",
        url: "/documents/listing/exclusive-right-of-sale-commercial.pdf",
        description: "Commercial property listing agreement",
      },
      {
        name: "Exclusive Brokerage Listing Agreement",
        url: "/documents/listing/exclusive-brokerage-listing-agreement.pdf",
        description: "Non-exclusive brokerage agreement",
      },
      {
        name: "Exclusive Right to Lease — Residential",
        url: "/documents/listing/exclusive-right-to-lease-residential.pdf",
        description: "Residential lease listing agreement",
      },
      {
        name: "Exclusive Right to Lease — Commercial",
        url: "/documents/listing/exclusive-right-to-lease-commercial.pdf",
        description: "Commercial lease listing agreement",
      },
      {
        name: "Compensation Agreement (Seller/Seller's Broker to Buyer's Broker)",
        url: "/documents/listing/compensation-agreement.pdf",
        description: "Broker compensation terms",
      },
    ],
  },
  {
    title: "Property Disclosures",
    documents: [
      {
        name: "Seller's Property Disclosure — Residential",
        url: "/documents/listing/sellers-disclosure-residential.pdf",
        description: "Standard residential seller disclosure",
      },
      {
        name: "Seller's Property Disclosure — Condominium",
        url: "/documents/listing/sellers-disclosure-condo.pdf",
        description: "Condo-specific seller disclosure",
      },
      {
        name: "Vacant Land Disclosure",
        url: "/documents/listing/vacant-land-disclosure.pdf",
        description: "Vacant land seller disclosure",
      },
      {
        name: "Condominium Association Disclosure",
        url: "/documents/listing/condo-association-disclosure.pdf",
        description: "Condo HOA disclosure requirements",
      },
      {
        name: "Home Owner's Association Disclosure",
        url: "/documents/listing/hoa-disclosure.pdf",
        description: "HOA disclosure requirements",
      },
      {
        name: "Sinkhole Disclosure",
        url: "/documents/listing/sinkhole-disclosure.pdf",
        description: "Florida sinkhole disclosure requirement",
      },
      {
        name: "Lead-Based Paint Disclosure",
        url: "/documents/listing/lead-paint-disclosure.pdf",
        description: "Federal lead paint disclosure (pre-1978)",
      },
      {
        name: "Lead-Based Paint Brochure",
        url: "/documents/listing/lead-paint-brochure.pdf",
        description: "EPA lead paint informational brochure",
      },
    ],
  },
  {
    title: "Addendums & Riders",
    documents: [
      {
        name: "Broker Relationship Disclosure",
        url: "/documents/listing/broker-relationship-disclosure.pdf",
        description: "Required broker relationship disclosure",
      },
      {
        name: "Showing Agreement",
        url: "/documents/listing/showing-agreement.pdf",
        description: "Property showing terms and agreement",
      },
      {
        name: "Licensee Disclosure of Personal Interest",
        url: "/documents/listing/licensee-personal-interest.pdf",
        description: "When agent has personal interest in property",
      },
      {
        name: "Chinese/Defective Drywall Addendum",
        url: "/documents/listing/defective-drywall-addendum.pdf",
        description: "Defective drywall disclosure addendum",
      },
      {
        name: "Short Sale Contingency (Rider G)",
        url: "/documents/listing/short-sale-contingency-rider-g.pdf",
        description: "Short sale contingency rider",
      },
      {
        name: "Sign Installation Order",
        url: "https://signpostmanorlando.com/login",
        description: "Order yard signs via SignPost",
        external: true,
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
        url: "/documents/sales/vacant-land-contract.pdf",
        description: "Purchase contract for vacant land",
      },
      {
        name: "Commercial Contract",
        url: "/documents/sales/commercial-contract.pdf",
        description: "Purchase contract for commercial property",
      },
    ],
  },
  {
    title: "Disclosures & Addendums",
    documents: [
      {
        name: "Buyers Disclosure",
        url: "/documents/sales/buyers-disclosure.pdf",
        description: "Buyer disclosure form",
      },
      {
        name: "Lead-Based Paint Disclosure",
        url: "/documents/listing/lead-paint-disclosure.pdf",
        description: "Federal lead paint disclosure (pre-1978)",
      },
      {
        name: "Lead-Based Paint Brochure",
        url: "/documents/listing/lead-paint-brochure.pdf",
        description: "EPA lead paint informational brochure",
      },
      {
        name: "Home Owner's Association Disclosure",
        url: "/documents/listing/hoa-disclosure.pdf",
        description: "HOA disclosure requirements",
      },
      {
        name: "Condo Association Disclosure",
        url: "/documents/sales/condo-association-disclosure.pdf",
        description: "Condo HOA disclosure form",
      },
      {
        name: "Condo Association Acknowledgement Form",
        url: "/documents/sales/condo-association-acknowledgement.pdf",
        description: "Condo association acknowledgement",
      },
      {
        name: "Broker Relationship Disclosure",
        url: "/documents/listing/broker-relationship-disclosure.pdf",
        description: "Required broker relationship disclosure",
      },
      {
        name: "Licensee Disclosure of Personal Interest (Rider AA)",
        url: "/documents/listing/licensee-personal-interest.pdf",
        description: "When agent has personal interest in property",
      },
      {
        name: "Chinese/Defective Drywall Addendum",
        url: "/documents/listing/defective-drywall-addendum.pdf",
        description: "Defective drywall disclosure addendum",
      },
      {
        name: "COVID-19 Extension Addendum",
        url: "/documents/sales/covid-extension-addendum.pdf",
        description: "Contract extension due to COVID-19",
      },
    ],
  },
  {
    title: "Riders",
    documents: [
      {
        name: "Appraisal Contingency (Rider F)",
        url: "/documents/sales/appraisal-contingency-rider-f.pdf",
        description: "Appraisal contingency rider for contracts",
      },
      {
        name: "Sale of Buyer's Property (Rider V)",
        url: "/documents/sales/sale-of-buyers-property-rider-v.pdf",
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
