import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { SERVICE_AREAS, AGENT_COUNT, YEARS_IN_BUSINESS } from "@/lib/constants";

const STATS = [
  { value: AGENT_COUNT, label: "Licensed Agents", icon: "👥" },
  { value: YEARS_IN_BUSINESS, label: "Years in Business", icon: "🏆" },
  { value: "5", label: "Counties Served", icon: "📍" },
  { value: "5,000+", label: "Homes Sold", icon: "🔑" },
];

export function CompanyDescription() {
  return (
    <section className="section-padding bg-navy-700 overflow-hidden">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left: Text content */}
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-400 mb-4">
              About Us
            </p>
            <h2 className="font-serif text-display-md font-semibold text-white leading-tight mb-6 text-balance">
              Central Florida&apos;s Most Trusted Real Estate Team
            </h2>
            <div className="space-y-4 text-slate-300 text-base leading-relaxed">
              <p>
                Home Wise Realty Group has been connecting Central Florida families with their
                dream homes for over {YEARS_IN_BUSINESS} years. With {AGENT_COUNT} licensed agents
                and deep roots in the community, we bring unmatched local expertise to every transaction.
              </p>
              <p>
                Whether you&apos;re buying your first home or selling a family estate, our agents
                provide the personalized guidance you deserve — from initial search to closing day
                and beyond.
              </p>
            </div>

            {/* Service areas */}
            <div className="mt-8 mb-8">
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-slate-400 mb-3">
                Service Areas
              </p>
              <div className="flex flex-wrap gap-2">
                {SERVICE_AREAS.map((area) => (
                  <span
                    key={area}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-navy-600 text-slate-200 border border-navy-500"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/about">
                <Button variant="outline-white" size="lg">
                  Learn About Us
                </Button>
              </Link>
              <Link href="/agents">
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-slate-300 hover:text-white hover:bg-white/10"
                >
                  Meet Our Agents
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: Stats grid */}
          <div className="grid grid-cols-2 gap-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="bg-navy-600/50 border border-navy-500 rounded-2xl p-6 text-center hover:bg-navy-600/80 transition-colors duration-300 group"
              >
                <div className="text-3xl mb-2">{stat.icon}</div>
                <p className="font-serif text-4xl font-bold text-white mb-1 group-hover:text-cream-100 transition-colors">
                  {stat.value}
                </p>
                <p className="text-xs font-medium text-slate-400 tracking-wide uppercase">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

        </div>
      </Container>
    </section>
  );
}
