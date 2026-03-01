export interface Community {
  slug: string;
  name: string;
  county: string;
  tagline: string;
  description: string;
  highlights: string[];
  stats: {
    medianPrice: string;
    avgDaysOnMarket: number;
    population: string;
  };
  imageUrl: string;
}

export const COMMUNITIES: Community[] = [
  {
    slug: "altamonte-springs",
    name: "Altamonte Springs",
    county: "Seminole",
    tagline: "The heart of Seminole County living",
    description:
      "Altamonte Springs offers a perfect blend of suburban comfort and urban convenience. Located just north of Orlando, this vibrant city features excellent schools, abundant dining options along Altamonte Drive, and the popular Cranes Roost Park — a waterfront destination for festivals, concerts, and evening walks. With easy access to I-4 and SunRail commuter rail, Altamonte Springs is ideal for professionals who want a short commute without sacrificing quality of life.",
    highlights: [
      "Cranes Roost Park — 45-acre lakefront park with amphitheater and walking trails",
      "SunRail Altamonte Springs station for easy downtown Orlando commute",
      "Altamonte Mall and surrounding retail corridor",
      "Top-rated Seminole County public schools",
      "Diverse dining scene with 200+ restaurants",
      "Minutes from Wekiwa Springs State Park",
    ],
    stats: { medianPrice: "$365,000", avgDaysOnMarket: 28, population: "45,000+" },
    imageUrl: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "winter-park",
    name: "Winter Park",
    county: "Orange",
    tagline: "Central Florida's most charming address",
    description:
      "Winter Park is one of Central Florida's most desirable communities, known for its brick-lined Park Avenue, world-class museums, and a chain of pristine lakes. Founded in the 1880s as a winter resort, the city retains its historic character with tree-canopied streets, Mediterranean-style architecture, and a walkable downtown. Home to Rollins College, the Charles Hosmer Morse Museum of American Art, and the Enzian Theater, Winter Park offers a cultural richness unmatched in the region.",
    highlights: [
      "Park Avenue — boutique shopping, galleries, and award-winning restaurants",
      "Scenic Boat Tour through the Winter Park chain of lakes",
      "Charles Hosmer Morse Museum of American Art (world's largest Tiffany collection)",
      "Rollins College campus and cultural events",
      "Winter Park Farmers' Market every Saturday",
      "Mead Botanical Garden — 47 acres of gardens and trails",
    ],
    stats: { medianPrice: "$625,000", avgDaysOnMarket: 22, population: "31,000+" },
    imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "orlando",
    name: "Orlando",
    county: "Orange",
    tagline: "Where opportunity meets lifestyle",
    description:
      "Orlando is far more than theme parks. Florida's largest inland city is a booming economic hub with a thriving job market in tech, healthcare, aerospace, and hospitality. Neighborhoods range from the trendy urban core of Thornton Park and Mills 50 to master-planned suburban communities in Lake Nona and Horizon West. With no state income tax, year-round sunshine, and a cost of living well below coastal Florida, Orlando continues to attract transplants from across the country.",
    highlights: [
      "Lake Nona — planned medical and tech hub with top-rated schools",
      "Downtown Orlando — arts district, nightlife, and professional sports",
      "Mills 50 and Thornton Park — walkable, culture-rich neighborhoods",
      "UCF, one of the nation's largest universities, drives innovation",
      "Orlando International Airport — global connectivity",
      "Hundreds of lakes and parks throughout the metro",
    ],
    stats: { medianPrice: "$395,000", avgDaysOnMarket: 25, population: "320,000+" },
    imageUrl: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "lake-mary",
    name: "Lake Mary",
    county: "Seminole",
    tagline: "Where families and Fortune 500s meet",
    description:
      "Lake Mary has evolved from a quiet bedroom community into one of Central Florida's most prestigious addresses. The Colonial TownPark mixed-use district brings upscale dining, boutique shopping, and office space together in a walkable setting. Major employers including AAA, Deloitte, and Verizon maintain regional offices here. The city consistently ranks among Florida's safest and best places to raise a family, with outstanding Seminole County schools and meticulously maintained neighborhoods.",
    highlights: [
      "Colonial TownPark — upscale dining, shopping, and lakeside living",
      "Top-rated Seminole County schools (Heathrow Elementary, Markham Woods Middle, Lake Mary High)",
      "Major employers — AAA, Deloitte, Verizon, Convergys",
      "Lake Mary Sports Complex — 16 athletic fields",
      "The Timacuan and Heathrow golf communities",
      "Minutes from I-4 and SR-417 for easy commuting",
    ],
    stats: { medianPrice: "$495,000", avgDaysOnMarket: 20, population: "17,000+" },
    imageUrl: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "oviedo",
    name: "Oviedo",
    county: "Seminole",
    tagline: "Small-town charm in a big-city metro",
    description:
      "Oviedo maintains a distinctive small-town identity while offering proximity to Orlando's employment centers and amenities. Known for its famous chickens that roam downtown, the city has a quirky, community-focused vibe anchored by the historic Oviedo Mall area and the thriving Oviedo on the Park mixed-use development. UCF's campus is just minutes away, adding a youthful energy and steady housing demand. The area features large-lot homes, excellent schools, and easy access to nature via the Cross Seminole Trail.",
    highlights: [
      "Oviedo on the Park — new town center with dining and entertainment",
      "Cross Seminole Trail for biking and jogging",
      "UCF campus proximity — strong rental and resale market",
      "Oviedo Marketplace and downtown revitalization",
      "Black Hammock Adventures at Lake Jesup",
      "Highly rated Oviedo High School and Hagerty High School",
    ],
    stats: { medianPrice: "$450,000", avgDaysOnMarket: 18, population: "42,000+" },
    imageUrl: "https://images.unsplash.com/photo-1576941089067-2de3c901e126?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "kissimmee",
    name: "Kissimmee",
    county: "Osceola",
    tagline: "Gateway to attractions and affordability",
    description:
      "Kissimmee and greater Osceola County offer some of Central Florida's best value for homebuyers. Situated south of Orlando with direct access to Walt Disney World, Universal Studios, and the Convention Center corridor, Kissimmee is a hub for both permanent residents and vacation-rental investors. The historic downtown along Broadway features local shops, restaurants, and the Kissimmee Lakefront Park on Lake Tohopekaliga — one of Florida's best bass fishing lakes.",
    highlights: [
      "Lakefront Park on Lake Tohopekaliga — fishing, trails, and festivals",
      "Historic downtown Kissimmee with local character",
      "Minutes from Walt Disney World and major attractions",
      "Strong vacation-rental investment market",
      "Osceola Heritage Park and Silver Spurs Arena",
      "Affordable price points compared to Orange and Seminole counties",
    ],
    stats: { medianPrice: "$340,000", avgDaysOnMarket: 32, population: "82,000+" },
    imageUrl: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "clermont",
    name: "Clermont",
    county: "Lake",
    tagline: "Central Florida's hill country",
    description:
      "Clermont stands apart in flat-as-a-pancake Florida with its rolling hills, citrus groves, and panoramic lake views. Located west of Orlando along the US-27 corridor, this fast-growing city offers new-construction homes at prices below the Orange County average. The National Training Center makes Clermont a magnet for triathletes and outdoor enthusiasts, while the growing Legends community and Hartwood Marsh Road corridor bring retail and dining options closer to home.",
    highlights: [
      "Rolling hills and lake views — unique in Central Florida",
      "National Training Center — world-class triathlon and cycling facility",
      "Waterfront Park and Lake Minneola trailhead",
      "Abundant new construction in master-planned communities",
      "South Lake County schools on the rise",
      "Florida's Turnpike and US-27 for easy commuting to Orlando",
    ],
    stats: { medianPrice: "$410,000", avgDaysOnMarket: 30, population: "44,000+" },
    imageUrl: "https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "sanford",
    name: "Sanford",
    county: "Seminole",
    tagline: "Historic waterfront meets modern growth",
    description:
      "Sanford is Seminole County's hidden gem, combining a revitalized historic downtown with waterfront living on Lake Monroe. First Street has become a destination dining district, and the Sanford Riverwalk offers miles of scenic walking along the St. Johns River. The city's SunRail station provides direct commuter-rail access to downtown Orlando, making Sanford increasingly popular with young professionals and families seeking character-rich neighborhoods at more accessible price points.",
    highlights: [
      "Historic downtown First Street — craft breweries, restaurants, and galleries",
      "Sanford Riverwalk along the St. Johns River and Lake Monroe",
      "SunRail commuter rail station for Orlando commuting",
      "Wayne Densch Performing Arts Center",
      "Central Florida Zoo & Botanical Gardens",
      "Mayfair Country Club and premier golf courses",
    ],
    stats: { medianPrice: "$355,000", avgDaysOnMarket: 26, population: "63,000+" },
    imageUrl: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80",
  },
];

export function getCommunityBySlug(slug: string): Community | undefined {
  return COMMUNITIES.find((c) => c.slug === slug);
}
