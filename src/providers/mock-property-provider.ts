import type {
  PropertyProvider,
  PropertyFilters,
  PropertySearchResult,
  Property,
} from "./property-provider";
import { MOCK_LISTINGS } from "@/data/mock/listings";

export class MockPropertyProvider implements PropertyProvider {
  async search(filters: PropertyFilters): Promise<PropertySearchResult> {
    const { location, minPrice, maxPrice, beds, baths, minSqft, maxSqft, propertyType, status, page = 1, perPage = 12 } = filters;

    let results: Property[] = [...MOCK_LISTINGS];

    if (location) {
      const q = location.toLowerCase();
      results = results.filter(
        (p) =>
          p.city.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          p.zip.includes(q)
      );
    }

    if (minPrice !== undefined) {
      results = results.filter((p) => p.price >= minPrice);
    }
    if (maxPrice !== undefined) {
      results = results.filter((p) => p.price <= maxPrice);
    }
    if (beds !== undefined) {
      results = results.filter((p) => p.beds >= beds);
    }
    if (baths !== undefined) {
      results = results.filter((p) => p.baths >= baths);
    }
    if (minSqft !== undefined) {
      results = results.filter((p) => p.sqft >= minSqft);
    }
    if (maxSqft !== undefined) {
      results = results.filter((p) => p.sqft <= maxSqft);
    }
    if (propertyType) {
      results = results.filter((p) => p.propertyType === propertyType);
    }
    if (status) {
      results = results.filter((p) => p.status === status);
    }

    results.sort((a, b) => b.price - a.price);

    const total = results.length;
    const totalPages = Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    const properties = results.slice(start, start + perPage);

    return { properties, total, totalPages, currentPage: page };
  }

  async getProperty(id: string): Promise<Property | null> {
    return MOCK_LISTINGS.find((l) => l.id === id) ?? null;
  }
}

export const propertyProvider = new MockPropertyProvider();
