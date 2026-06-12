export type MatchableContact = {
  prefBudgetMin: number | null;
  prefBudgetMax: number | null;
  prefCities: string[];
  prefMinBeds: number | null;
};

export type MatchableListing = {
  price: number;
  city: string;
  beds: number;
  status: string;
};

export function contactHasPreferences(contact: MatchableContact): boolean {
  return (
    contact.prefBudgetMin != null ||
    contact.prefBudgetMax != null ||
    contact.prefCities.length > 0 ||
    contact.prefMinBeds != null
  );
}

export function contactMatchesListing(
  contact: MatchableContact,
  listing: MatchableListing,
): boolean {
  if (listing.status !== "Active") return false;
  if (!contactHasPreferences(contact)) return false;

  if (contact.prefBudgetMin != null && listing.price < contact.prefBudgetMin) return false;
  if (contact.prefBudgetMax != null && listing.price > contact.prefBudgetMax) return false;
  if (contact.prefMinBeds != null && listing.beds < contact.prefMinBeds) return false;
  if (contact.prefCities.length > 0) {
    const city = listing.city.trim().toLowerCase();
    const wanted = contact.prefCities.map((c) => c.trim().toLowerCase());
    if (!wanted.includes(city)) return false;
  }

  return true;
}
