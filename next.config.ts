import type { NextConfig } from "next";
import { OLD_SITE_REDIRECTS } from "./src/config/redirects";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // isomorphic-dompurify lazy-requires jsdom at server module-load. Keep these
  // external so Next traces them into the Vercel lambda instead of bundling
  // (bundling drops jsdom's dynamic require → "Failed to load external module").
  serverExternalPackages: ["isomorphic-dompurify", "jsdom"],
  images: {
    localPatterns: [
      { pathname: "/api/mls-photo" },
      { pathname: "/**", search: "" },
    ],
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
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
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
          { key: "X-XSS-Protection", value: "0" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
      {
        source: "/images/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/property-updates/confirm",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
      {
        source: "/unsubscribe",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
