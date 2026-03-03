import type { NextConfig } from "next";

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
    return [
      {
        source: "/Prepping-Your-Home",
        destination: "/sellers/staging",
        permanent: true,
      },
      {
        source: "/Sell-Your-Home-FAST",
        destination: "/sellers/sell-fast",
        permanent: true,
      },
      {
        source: "/Moving-Assistance",
        destination: "/buyers/moving-tips",
        permanent: true,
      },
      {
        source: "/preparing-to-buy",
        destination: "/buyers/preparing",
        permanent: true,
      },
      {
        source: "/sounds-and-smells",
        destination: "/sellers/sounds-and-smells",
        permanent: true,
      },
    ];
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
