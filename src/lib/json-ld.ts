import type { WithContext, Organization, WebSite, Product, Person, Place, Article, BreadcrumbList } from "schema-dts";
import { SITE_NAME, SITE_URL, DESCRIPTION, PHONE, ADDRESS, SOCIAL_LINKS, TAGLINE } from "./constants";

export function organizationJsonLd(): WithContext<Organization> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon`,
    description: DESCRIPTION,
    telephone: PHONE,
    address: {
      "@type": "PostalAddress",
      streetAddress: ADDRESS.street,
      addressLocality: ADDRESS.city,
      addressRegion: ADDRESS.state,
      postalCode: ADDRESS.zip,
      addressCountry: "US",
    },
    sameAs: [SOCIAL_LINKS.facebook, SOCIAL_LINKS.instagram, SOCIAL_LINKS.linkedin, SOCIAL_LINKS.twitter],
  };
}

export function websiteJsonLd(): WithContext<WebSite> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: TAGLINE,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/properties?location={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    } as WithContext<WebSite>["potentialAction"],
  };
}

export function realEstateListingJsonLd(property: {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  imageUrl: string;
  description?: string | null;
  status: string;
}): WithContext<Product> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${property.address}, ${property.city}, ${property.state} ${property.zip}`,
    description: property.description ?? `${property.beds} bed, ${property.baths} bath, ${property.sqft.toLocaleString()} sq ft home in ${property.city}, FL.`,
    image: property.imageUrl,
    url: `${SITE_URL}/properties/${property.id}`,
    offers: {
      "@type": "Offer",
      price: property.price,
      priceCurrency: "USD",
      availability: property.status === "Sold" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
    },
  };
}

export function agentPersonJsonLd(agent: {
  firstName: string;
  lastName: string;
  slug: string;
  phone?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  designations: string[];
}): WithContext<Person> {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: `${agent.firstName} ${agent.lastName}`,
    jobTitle: "Real Estate Agent",
    worksFor: { "@type": "Organization", name: SITE_NAME },
    url: `${SITE_URL}/agents/${agent.slug}`,
    ...(agent.phone && { telephone: agent.phone }),
    ...(agent.email && { email: agent.email }),
    ...(agent.photoUrl && { image: agent.photoUrl }),
    ...(agent.designations.length > 0 && { knowsAbout: agent.designations }),
  };
}

export function communityPlaceJsonLd(community: {
  name: string;
  slug: string;
  county: string;
  description: string;
}): WithContext<Place> {
  return {
    "@context": "https://schema.org",
    "@type": "Place",
    name: community.name,
    description: community.description,
    url: `${SITE_URL}/communities/${community.slug}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: community.name,
      addressRegion: "FL",
      addressCountry: "US",
    },
    containedInPlace: {
      "@type": "AdministrativeArea",
      name: `${community.county} County, FL`,
    },
  };
}

export function breadcrumbJsonLd(
  items: { name: string; href: string }[],
): WithContext<BreadcrumbList> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.href}`,
    })),
  };
}

export function articleJsonLd(params: {
  title: string;
  description: string;
  path: string;
}): WithContext<Article> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: params.title,
    description: params.description,
    url: `${SITE_URL}${params.path}`,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icon` },
    },
  };
}
