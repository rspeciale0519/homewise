import type { NextConfig } from "next";
import { OLD_SITE_REDIRECTS } from "./src/config/redirects";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "fkwkjlsftlkjpiyspdbm.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "**.mlsgrid.com",
      },
      {
        protocol: "https",
        hostname: "photos.stellarmls.com",
      },
      {
        protocol: "https",
        hostname: "api.mapbox.com",
      },
    ],
  },
  async redirects() {
    return OLD_SITE_REDIRECTS;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
