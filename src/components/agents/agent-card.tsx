import Link from "next/link";
import Image from "next/image";
import type { Agent } from "@/types/agent";

interface AgentCardProps {
  agent: Agent;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function AgentCard({ agent }: AgentCardProps) {
  const initials = getInitials(agent.firstName, agent.lastName);
  const fullName = `${agent.firstName} ${agent.lastName}`;

  return (
    <Link
      href={`/agents/${agent.slug}`}
      className="group block rounded-2xl bg-white border border-slate-100 overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1"
    >
      {/* Photo area */}
      <div className="relative aspect-[4/5] bg-gradient-to-br from-navy-600 to-navy-800 overflow-hidden">
        {agent.photoUrl ? (
          <Image
            src={agent.photoUrl}
            alt={fullName}
            fill
            className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-serif text-5xl font-bold text-white/30">{initials}</span>
          </div>
        )}
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Hover CTA */}
        <div className="absolute bottom-4 left-4 right-4 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white">
            View Profile
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </span>
        </div>

        {/* Language badges — top right */}
        {agent.languages.length > 1 && (
          <div className="absolute top-3 right-3 flex flex-wrap gap-1 justify-end">
            {agent.languages.filter((l) => l !== "English").map((lang) => (
              <span
                key={lang}
                className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-white/90 backdrop-blur-sm text-navy-700 rounded-full"
              >
                {lang}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Info area */}
      <div className="p-5">
        <h3 className="font-serif text-lg font-semibold text-navy-700 group-hover:text-crimson-600 transition-colors">
          {fullName}
        </h3>

        {/* Designations */}
        {agent.designations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {agent.designations.map((d) => (
              <span
                key={d}
                className="px-2 py-0.5 text-[10px] font-semibold tracking-widest uppercase text-navy-500 bg-navy-50 rounded-md"
              >
                {d}
              </span>
            ))}
          </div>
        )}

        {/* Phone */}
        {agent.phone && (
          <div className="flex items-center gap-2 mt-3 text-sm text-slate-500">
            <svg className="h-3.5 w-3.5 text-crimson-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {agent.phone}
          </div>
        )}
      </div>
    </Link>
  );
}
