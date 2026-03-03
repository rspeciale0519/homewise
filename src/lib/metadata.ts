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
  image,
}: MetadataParams): Metadata {
  const url = `${SITE_URL}${path}`;
  const ogTitle = `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: SITE_NAME,
      ...(image && { images: [{ url: image, width: 1200, height: 630, alt: title }] }),
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      ...(image && { images: [image] }),
    },
    alternates: {
      canonical: url,
    },
  };
}
