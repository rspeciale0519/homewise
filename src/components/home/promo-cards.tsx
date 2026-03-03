import Link from "next/link";
import { Container } from "@/components/ui/container";
import { StaggerChildren, StaggerItem } from "@/components/shared/stagger-children";

const PROMO_CARDS = [
  {
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    eyebrow: "Stay Informed",
    title: "Market Updates",
    description:
      "Get real-time insights on Central Florida home values, market trends, and neighborhood reports — so you're always one step ahead.",
    href: "/about",
    color: "navy" as const,
  },
  {
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
    eyebrow: "Ready to Buy",
    title: "Home Buying Guide",
    description:
      "From preparing your finances to closing day, our experienced buyer agents will guide you through every step of finding your perfect Florida home.",
    href: "/buyers",
    color: "crimson" as const,
  },
  {
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    eyebrow: "Selling Your Home",
    title: "Seller Resources",
    description:
      "Maximize your home's value with our proven strategies — professional staging advice, pricing expertise, and a network of 186+ motivated agents.",
    href: "/sellers",
    color: "gold" as const,
  },
];

const colorMap = {
  navy: {
    icon: "bg-navy-50 text-navy-600",
    accent: "bg-navy-600",
    eyebrow: "text-navy-500",
    arrow: "text-navy-600 group-hover:text-navy-700",
    border: "group-hover:border-navy-200",
  },
  crimson: {
    icon: "bg-crimson-50 text-crimson-600",
    accent: "bg-crimson-600",
    eyebrow: "text-crimson-500",
    arrow: "text-crimson-600 group-hover:text-crimson-700",
    border: "group-hover:border-crimson-200",
  },
  gold: {
    icon: "bg-amber-50 text-amber-600",
    accent: "bg-amber-500",
    eyebrow: "text-amber-600",
    arrow: "text-amber-600 group-hover:text-amber-700",
    border: "group-hover:border-amber-200",
  },
};

export function PromoCards() {
  return (
    <section className="section-padding bg-cream-50">
      <Container>
        <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {PROMO_CARDS.map((card, i) => {
            const colors = colorMap[card.color];
            return (
              <StaggerItem key={card.title}>
              <Link
                href={card.href}
                className={`group relative bg-white rounded-2xl p-8 border border-slate-100 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-elevated ${colors.border} flex flex-col`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {/* Top accent bar */}
                <div className={`absolute top-0 left-8 right-8 h-0.5 rounded-full ${colors.accent} scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />

                {/* Icon */}
                <div className={`inline-flex items-center justify-center h-14 w-14 rounded-xl ${colors.icon} mb-6 transition-transform duration-300 group-hover:scale-110`}>
                  {card.icon}
                </div>

                {/* Eyebrow */}
                <p className={`text-xs font-semibold tracking-[0.15em] uppercase mb-2 ${colors.eyebrow}`}>
                  {card.eyebrow}
                </p>

                {/* Title */}
                <h3 className="font-serif text-xl font-semibold text-navy-700 mb-3 group-hover:text-navy-800 transition-colors">
                  {card.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-slate-500 leading-relaxed flex-1">
                  {card.description}
                </p>

                {/* Arrow link */}
                <div className={`flex items-center gap-2 mt-6 text-sm font-semibold ${colors.arrow} transition-colors`}>
                  <span>Learn more</span>
                  <svg
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </Link>
              </StaggerItem>
            );
          })}
        </StaggerChildren>
      </Container>
    </section>
  );
}
