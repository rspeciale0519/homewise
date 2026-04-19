export type DocumentSection = "office" | "listing" | "sales";

export interface DocumentCategoryItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  section: DocumentSection;
  sortOrder: number;
  documentCount: number;
}

export interface DocumentItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  url: string | null;
  external: boolean;
  storageKey: string | null;
  storageProvider: string;
  mimeType: string | null;
  sizeBytes: number | null;
  sortOrder: number;
  published: boolean;
  quickAccess: boolean;
  createdAt: string;
  updatedAt: string;
  categories: Array<{ id: string; title: string; section: DocumentSection }>;
}

export interface AdminDocumentInCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  published: boolean;
  quickAccess: boolean;
  external: boolean;
  url: string | null;
  storageKey: string | null;
  storageProvider: string;
  mimeType: string | null;
  membership: { categoryId: string; sortOrder: number };
}

export interface AdminCategoryTree {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  section: DocumentSection;
  sortOrder: number;
  documents: AdminDocumentInCategory[];
}

export interface OrganizeTree {
  sections: {
    office: { categories: AdminCategoryTree[] };
    listing: { categories: AdminCategoryTree[] };
    sales: { categories: AdminCategoryTree[] };
  };
}
