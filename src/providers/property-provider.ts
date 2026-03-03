export interface OpenHouseSlot {
  date: string;
  startTime: string;
  endTime: string;
  remarks?: string;
}

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
  // Map bounds
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  // Polygon search (GeoJSON coordinates)
  polygon?: [number, number][];
  // Advanced filters
  minYearBuilt?: number;
  maxYearBuilt?: number;
  minLotSize?: number;
  maxLotSize?: number;
  maxHoa?: number;
  maxDom?: number;
  hasPool?: boolean;
  hasWaterfront?: boolean;
  hasGarage?: boolean;
  isNewConstruction?: boolean;
  hasGatedCommunity?: boolean;
  openHousesOnly?: boolean;
  schoolDistrict?: string;
  featured?: boolean;
  listingAgentMlsId?: string;
  listingOfficeMlsId?: string;
  // Sorting
  sortBy?: "price_asc" | "price_desc" | "newest" | "dom_asc" | "dom_desc" | "sqft_desc";
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
  // Extended fields (optional for backward compat with mock data)
  mlsId?: string;
  closePrice?: number;
  originalListPrice?: number;
  county?: string;
  subdivision?: string;
  description?: string;
  photos?: string[];
  yearBuilt?: number;
  lotSize?: number;
  latitude?: number;
  longitude?: number;
  hoaFee?: number;
  hoaFrequency?: string;
  taxAmount?: number;
  taxYear?: number;
  hasPool?: boolean;
  hasWaterfront?: boolean;
  hasGarage?: boolean;
  isNewConstruction?: boolean;
  hasGatedCommunity?: boolean;
  openHouseSchedule?: OpenHouseSlot[];
  schoolDistrict?: string;
  elementarySchool?: string;
  middleSchool?: string;
  highSchool?: string;
  listingAgentName?: string;
  listingAgentMlsId?: string;
  listingAgentPhone?: string;
  listingAgentEmail?: string;
  listingOfficeName?: string;
  listingOfficeMlsId?: string;
  walkScore?: number;
  transitScore?: number;
  bikeScore?: number;
  featured?: boolean;
  virtualTourUrl?: string;
  listDate?: string;
  closeDate?: string;
  remarks?: string;
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
