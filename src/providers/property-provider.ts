export interface PropertyFilters {
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  minSqft?: number;
  maxSqft?: number;
  propertyType?: string;
  status?: string;
  page?: number;
  perPage?: number;
}

export interface Property {
  id: string;
  price: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  beds: number;
  baths: number;
  sqft: number;
  garage: number;
  propertyType: string;
  status: string;
  imageUrl: string;
  daysOnMarket: number;
}

export interface PropertySearchResult {
  properties: Property[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export interface PropertyProvider {
  search(filters: PropertyFilters): Promise<PropertySearchResult>;
  getProperty(id: string): Promise<Property | null>;
}
