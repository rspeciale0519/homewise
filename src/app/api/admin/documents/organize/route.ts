import { NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import type {
  AdminCategoryTree,
  DocumentSection,
  OrganizeTree,
} from "@/app/admin/documents/types";

const SECTIONS: DocumentSection[] = ["office", "listing", "sales"];

export async function GET() {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const categories = await prisma.documentCategory.findMany({
    orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
    include: {
      documents: {
        orderBy: { sortOrder: "asc" },
        include: { document: true },
      },
    },
  });

  const shapedCategories: AdminCategoryTree[] = categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    section: c.section as DocumentSection,
    sortOrder: c.sortOrder,
    documents: c.documents.map((m) => ({
      id: m.document.id,
      slug: m.document.slug,
      name: m.document.name,
      description: m.document.description,
      published: m.document.published,
      quickAccess: m.document.quickAccess,
      external: m.document.external,
      url: m.document.url,
      storageKey: m.document.storageKey,
      storageProvider: m.document.storageProvider,
      mimeType: m.document.mimeType,
      membership: { categoryId: c.id, sortOrder: m.sortOrder },
    })),
  }));

  const tree: OrganizeTree = {
    sections: SECTIONS.reduce(
      (acc, s) => {
        acc[s] = {
          categories: shapedCategories.filter((c) => c.section === s),
        };
        return acc;
      },
      {} as OrganizeTree["sections"],
    ),
  };

  return NextResponse.json(tree);
}
