export interface MockAgent {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  email: string;
  phone: string;
  photoUrl: string;
  languages: string[];
  designations: string[];
  bio: string;
  active: boolean;
}

export const MOCK_AGENTS: MockAgent[] = [
  {
    id: "agt_01",
    firstName: "Maria",
    lastName: "Alvarez",
    slug: "maria-alvarez",
    email: "maria.alvarez@homewisefl.com",
    phone: "(407) 555-0101",
    photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&h=500&q=80",
    languages: ["English", "Spanish"],
    designations: ["CRS", "GRI"],
    bio: "Maria brings over 12 years of experience helping families find their perfect home in the Greater Orlando area. Specializing in Kissimmee and Osceola County, she is known for her tireless advocacy during negotiations and her deep understanding of the Central Florida market. Maria's bilingual fluency has made her a trusted resource for the region's growing Hispanic community.",
    active: true,
  },
  {
    id: "agt_02",
    firstName: "James",
    lastName: "Bennett",
    slug: "james-bennett",
    email: "james.bennett@homewisefl.com",
    phone: "(407) 555-0102",
    photoUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&h=500&q=80",
    languages: ["English"],
    designations: ["ABR", "SRS"],
    bio: "James is a buyer representation specialist who has helped over 300 families navigate the purchase process in Orange and Seminole counties. His methodical approach to market analysis and negotiation strategy has earned him a loyal referral base. Before real estate, James spent a decade in financial planning — a background that helps his clients think long-term about their investment.",
    active: true,
  },
  {
    id: "agt_03",
    firstName: "Linh",
    lastName: "Chen",
    slug: "linh-chen",
    email: "linh.chen@homewisefl.com",
    phone: "(407) 555-0103",
    photoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&h=500&q=80",
    languages: ["English", "Vietnamese", "Mandarin"],
    designations: ["CRS", "ABR"],
    bio: "Linh is a top-producing agent who serves the diverse communities of East Orlando, Lake Nona, and Avalon Park. Her trilingual skills and deep cultural awareness make her an exceptional guide for international buyers relocating to Central Florida. Linh has been recognized as a Circle of Excellence award winner for three consecutive years.",
    active: true,
  },
  {
    id: "agt_04",
    firstName: "Robert",
    lastName: "Daniels",
    slug: "robert-daniels",
    email: "robert.daniels@homewisefl.com",
    phone: "(407) 555-0104",
    photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&h=500&q=80",
    languages: ["English"],
    designations: ["GRI"],
    bio: "Robert has been a Central Florida resident for over 30 years and brings unmatched local knowledge to every transaction. He specializes in the Winter Park, Maitland, and College Park markets — neighborhoods he knows block by block. Robert's clients value his straightforward communication style and his commitment to getting the details right.",
    active: true,
  },
  {
    id: "agt_05",
    firstName: "Sofia",
    lastName: "Espinoza",
    slug: "sofia-espinoza",
    email: "sofia.espinoza@homewisefl.com",
    phone: "(407) 555-0105",
    photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&h=500&q=80",
    languages: ["English", "Spanish", "Portuguese"],
    designations: ["SRS", "CRS"],
    bio: "Sofia is a listing specialist who consistently achieves above-asking-price results for her sellers. Her background in interior design gives her a sharp eye for staging and presentation, and her trilingual fluency opens doors in Central Florida's international markets. Sofia leads the Home Wise luxury division in Windermere and Dr. Phillips.",
    active: true,
  },
  {
    id: "agt_06",
    firstName: "David",
    lastName: "Foster",
    slug: "david-foster",
    email: "david.foster@homewisefl.com",
    phone: "(407) 555-0106",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=500&q=80",
    languages: ["English"],
    designations: ["ABR"],
    bio: "David focuses exclusively on first-time homebuyers in the greater Orlando metro, guiding them from pre-approval through closing day. His patient, educational approach has made him a favorite among young professionals and newly married couples entering the market for the first time. David also hosts monthly first-time buyer seminars at the Home Wise office.",
    active: true,
  },
  {
    id: "agt_07",
    firstName: "Aisha",
    lastName: "Hassan",
    slug: "aisha-hassan",
    email: "aisha.hassan@homewisefl.com",
    phone: "(407) 555-0107",
    photoUrl: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=400&h=500&q=80",
    languages: ["English", "Arabic"],
    designations: ["CRS", "GRI", "ABR"],
    bio: "Aisha is one of Home Wise's most accomplished agents, holding three major designations and consistently ranking in the top 5% of Central Florida agents by transaction volume. She serves the Lake County and west Orange County markets with a focus on relocation clients. Aisha's organizational skills and responsiveness are legendary among her clients.",
    active: true,
  },
  {
    id: "agt_08",
    firstName: "Michael",
    lastName: "Johnson",
    slug: "michael-johnson",
    email: "michael.johnson@homewisefl.com",
    phone: "(407) 555-0108",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&h=500&q=80",
    languages: ["English"],
    designations: ["SRS"],
    bio: "Michael is a seller representation specialist who has listed over 500 homes in his 15-year career. His marketing strategy combines professional photography, targeted digital advertising, and strategic open houses to maximize exposure and drive competitive offers. Michael's sellers consistently close within 2% of asking price.",
    active: true,
  },
  {
    id: "agt_09",
    firstName: "Elena",
    lastName: "Kozlova",
    slug: "elena-kozlova",
    email: "elena.kozlova@homewisefl.com",
    phone: "(407) 555-0109",
    photoUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&h=500&q=80",
    languages: ["English", "Russian", "Ukrainian"],
    designations: ["GRI"],
    bio: "Elena serves Central Florida's Eastern European community with warmth, professionalism, and deep market expertise. Specializing in the Volusia County corridor from Deltona to Daytona Beach, Elena has built her business entirely on referrals — a testament to the trust she earns with every client. She is also a licensed notary and can assist with document preparation.",
    active: true,
  },
  {
    id: "agt_10",
    firstName: "Marcus",
    lastName: "Lee",
    slug: "marcus-lee",
    email: "marcus.lee@homewisefl.com",
    phone: "(407) 555-0110",
    photoUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&h=500&q=80",
    languages: ["English", "Korean"],
    designations: ["ABR", "CRS"],
    bio: "Marcus is a buyer specialist covering the rapidly growing Horizon West, Hamlin, and Waterford Lakes communities. With a technology background, Marcus brings data-driven analysis to every home search — helping buyers understand value beyond the listing sheet. His weekend open house tours are legendary for their efficiency and insight.",
    active: true,
  },
  {
    id: "agt_11",
    firstName: "Patricia",
    lastName: "Morales",
    slug: "patricia-morales",
    email: "patricia.morales@homewisefl.com",
    phone: "(407) 555-0111",
    photoUrl: "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&w=400&h=500&q=80",
    languages: ["English", "Spanish"],
    designations: ["SRS", "GRI"],
    bio: "Patricia has been serving the Poinciana, Haines City, and Davenport communities for over a decade. Her deep roots in the south Osceola County market give her sellers a distinct advantage — she knows which improvements drive the highest returns and how to position homes for maximum exposure. Patricia also manages a successful rental portfolio advisory practice.",
    active: true,
  },
  {
    id: "agt_12",
    firstName: "Thomas",
    lastName: "Nguyen",
    slug: "thomas-nguyen",
    email: "thomas.nguyen@homewisefl.com",
    phone: "(407) 555-0112",
    photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&h=500&q=80",
    languages: ["English", "Vietnamese"],
    designations: ["ABR"],
    bio: "Thomas is a rising star in the Home Wise brokerage, specializing in the Mills 50, Thornton Park, and downtown Orlando condo markets. His deep understanding of urban living — from HOA financials to walkability metrics — helps buyers make smart decisions in one of Central Florida's most dynamic real estate segments.",
    active: true,
  },
  {
    id: "agt_13",
    firstName: "Rachel",
    lastName: "Okafor",
    slug: "rachel-okafor",
    email: "rachel.okafor@homewisefl.com",
    phone: "(407) 555-0113",
    photoUrl: "https://images.unsplash.com/photo-1589156280159-27a852cc18c5?auto=format&fit=crop&w=400&h=500&q=80",
    languages: ["English", "French"],
    designations: ["CRS"],
    bio: "Rachel serves the Seminole County market — Longwood, Altamonte Springs, Casselberry, and Sanford — with a focus on investment properties and multi-family acquisitions. Her analytical approach and financial modeling skills help investors understand cap rates, cash-on-cash returns, and long-term appreciation potential before committing capital.",
    active: true,
  },
  {
    id: "agt_14",
    firstName: "William",
    lastName: "Park",
    slug: "william-park",
    email: "william.park@homewisefl.com",
    phone: "(407) 555-0114",
    photoUrl: "https://images.unsplash.com/photo-1522556189639-b150ed9c4330?auto=format&fit=crop&w=400&h=500&q=80",
    languages: ["English", "Korean"],
    designations: ["GRI", "SRS"],
    bio: "William is a seasoned listing agent who combines decades of experience with modern marketing techniques. He serves the Oviedo, Winter Springs, and UCF corridor markets where his reputation for honest pricing and responsive communication has earned him a steady stream of repeat and referral business. William is also a certified military relocation specialist.",
    active: true,
  },
  {
    id: "agt_15",
    firstName: "Amanda",
    lastName: "Sullivan",
    slug: "amanda-sullivan",
    email: "amanda.sullivan@homewisefl.com",
    phone: "(407) 555-0115",
    photoUrl: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=400&h=500&q=80",
    languages: ["English"],
    designations: ["ABR", "SRS", "CRS"],
    bio: "Amanda is a dual-certified buyer and seller specialist who leads the Home Wise relocation division. With three major designations, she handles complex transactions — including corporate relocations, estate sales, and multi-property exchanges — with exceptional attention to detail. Amanda has been named Home Wise Agent of the Year twice.",
    active: true,
  },
];

export const AVAILABLE_LANGUAGES = [
  ...new Set(MOCK_AGENTS.flatMap((a) => a.languages)),
].sort();

export const AVAILABLE_DESIGNATIONS = [
  ...new Set(MOCK_AGENTS.flatMap((a) => a.designations)),
].sort();

export function getAgentBySlug(slug: string): MockAgent | undefined {
  return MOCK_AGENTS.find((a) => a.slug === slug && a.active);
}

export function filterAgents(params: {
  language?: string;
  letter?: string;
  search?: string;
  page?: number;
  perPage?: number;
}): { agents: MockAgent[]; total: number; totalPages: number } {
  const { language, letter, search, page = 1, perPage = 12 } = params;

  let filtered = MOCK_AGENTS.filter((a) => a.active);

  if (language) {
    filtered = filtered.filter((a) =>
      a.languages.some((l) => l.toLowerCase() === language.toLowerCase())
    );
  }

  if (letter) {
    filtered = filtered.filter(
      (a) => a.lastName.charAt(0).toUpperCase() === letter.toUpperCase()
    );
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.firstName.toLowerCase().includes(q) ||
        a.lastName.toLowerCase().includes(q) ||
        `${a.firstName} ${a.lastName}`.toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => a.lastName.localeCompare(b.lastName));

  const total = filtered.length;
  const totalPages = Math.ceil(total / perPage);
  const start = (page - 1) * perPage;
  const agents = filtered.slice(start, start + perPage);

  return { agents, total, totalPages };
}
