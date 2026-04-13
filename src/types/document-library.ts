export type DocumentSection = "office" | "listing" | "sales";

export interface LibraryDocument {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  external: boolean;
  url: string | null;
  storageKey: string | null;
  storageProvider: string;
  viewable: boolean;
}

export interface LibraryCategory {
  id: string;
  title: string;
  description: string | null;
  documents: LibraryDocument[];
}

export interface LibrarySection {
  label: string;
  key: DocumentSection;
  count: number;
  categories: LibraryCategory[];
}
