import type { Metadata } from "next";
import { SITE_NAME, SITE_URL, DESCRIPTION } from "./constants";

interface MetadataParams {
  title: string;
  description?: string;
  path?: string;
  image?: string;
}

export function createMetadata({
  title,
  description = DESCRIPTION,
  path = "",
  image = "/images/og/default.jpg",
}: MetadataParams): Metadata {
  const url = `${SITE_URL}${path}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [image],
    },
    alternates: {
      canonical: url,
    },
  };
}
