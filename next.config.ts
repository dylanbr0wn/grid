import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lastfm.freetls.fastly.net',
        port: '',
        pathname: '/i/u/174s/**',
        search: '',
      },
    ],
    formats: ['image/webp'],
  }
  /* config options here */
};

export default nextConfig;
