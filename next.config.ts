import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lastfm.freetls.fastly.net',
        port: '',
        pathname: '/i/u/174s/**',
        search: '',
      },
      {
        protocol: 'https',
        hostname: 'coverartarchive.org',
        port: '',
        pathname: '/release-group/**',
        search: '',
      },
    ],
    formats: ['image/webp'],
  }
  /* config options here */
};

export default nextConfig;
