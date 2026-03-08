import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ContactsTable } from "./contacts-table";

export const metadata: Metadata = { title: "Contacts — Admin" };

const STAGES = ["new_lead", "contacted", "searching", "showing", "offer", "under_contract", "closed", "lost"];
const SOURCES = ["website", "referral", "zillow", "realtor", "social", "open_house", "manual"];
const TYPES = ["buyer", "seller", "both"];

interface ContactsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(String(params.page ?? "1"), 10) || 1);
  const search = typeof params.search === "string" ? params.search : undefined;
  const stage = typeof params.stage === "string" ? params.stage : undefined;
  const source = typeof params.source === "string" ? params.source : undefined;
  const type = typeof params.type === "string" ? params.type : undefined;
  const perPage = 25;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (stage) where.stage = stage;
  if (source) where.source = source;
  if (type) where.type = type;

  const [contacts, total, agents] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: {
        assignedAgent: { select: { id: true, firstName: true, lastName: true } },
        tags: { include: { tag: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.contact.count({ where }),
    prisma.agent.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true }, orderBy: { lastName: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-navy-700">Contacts</h1>
          <p className="text-slate-500 text-sm">{total} total contacts</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/api/admin/contacts/export?${new URLSearchParams(Object.fromEntries(Object.entries({ stage, source, type }).filter(([, v]) => v !== undefined) as [string, string][]))}`}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Export CSV
          </Link>
        </div>
      </div>

      <ContactsTable
        contacts={contacts.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(), birthday: c.birthday?.toISOString() ?? null, closeAnniversary: c.closeAnniversary?.toISOString() ?? null, tags: c.tags.map((t) => ({ tag: { id: t.tag.id, name: t.tag.name, color: t.tag.color } })) }))}
        agents={agents}
        total={total}
        totalPages={totalPages}
        currentPage={page}
        currentSearch={search}
        currentStage={stage}
        currentSource={source}
        currentType={type}
        stages={STAGES}
        sources={SOURCES}
        types={TYPES}
      />
    </div>
  );
}
