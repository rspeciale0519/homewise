export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  preferredAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FavoriteProperty {
  id: string;
  userId: string;
  propertyId: string;
  notes: string | null;
  savedAt: Date;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  filters: Record<string, unknown>;
  alertEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecentlyViewed {
  id: string;
  userId: string;
  propertyId: string;
  viewedAt: Date;
}
