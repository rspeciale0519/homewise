export interface NavChild {
  label: string;
  href: string;
  description?: string;
}

export interface NavItem {
  label: string;
  href: string;
  children?: NavChild[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "About",
    href: "/about",
  },
  {
    label: "Find an Agent",
    href: "/agents",
  },
  {
    label: "For Sellers",
    href: "/sellers",
    children: [
      {
        label: "Seller Resources",
        href: "/sellers",
        description: "Everything you need to sell your home",
      },
      {
        label: "Home Staging Tips",
        href: "/sellers/staging",
        description: "Prepare your home to impress buyers",
      },
      {
        label: "Sell Your Home Fast",
        href: "/sellers/sell-fast",
        description: "Proven strategies to accelerate your sale",
      },
      {
        label: "Sounds & Smells",
        href: "/sellers/sounds-and-smells",
        description: "Often overlooked details that matter",
      },
      {
        label: "Seller Advice",
        href: "/sellers/seller-advice",
        description: "Expert tips from our top agents",
      },
    ],
  },
  {
    label: "For Buyers",
    href: "/buyers",
    children: [
      {
        label: "Buyer Resources",
        href: "/buyers",
        description: "Your complete guide to buying in Florida",
      },
      {
        label: "Preparing to Buy",
        href: "/buyers/preparing",
        description: "What you need before you start searching",
      },
      {
        label: "Home Inspection Guide",
        href: "/buyers/home-inspection",
        description: "What to look for before hiring a pro",
      },
      {
        label: "Choosing a Location",
        href: "/buyers/location",
        description: "Find the right community for your lifestyle",
      },
      {
        label: "Moving Tips",
        href: "/buyers/moving-tips",
        description: "Make your move seamless and stress-free",
      },
      {
        label: "Condo vs. House",
        href: "/buyers/condo-vs-house",
        description: "Compare your options with confidence",
      },
      {
        label: "Mortgage Calculator",
        href: "/mortgage-calculator",
        description: "Estimate your monthly payments instantly",
      },
    ],
  },
  {
    label: "Properties",
    href: "/properties",
  },
  {
    label: "Communities",
    href: "/communities",
  },
];
