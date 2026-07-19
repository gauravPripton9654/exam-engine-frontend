import type { NextConfig } from "next";

// Backend the frontend proxies through /api/backend/* — kept server-side
// (not NEXT_PUBLIC_) since it's only ever read here, at build/route time,
// never shipped to the browser bundle.
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://44.195.197.199:8001';

const nextConfig: NextConfig = {
  turbopack: {},
  allowedDevOrigins: ['192.168.1.21'],

  // Proxies calls to the plain-HTTP backend through this app's own HTTPS
  // origin, so the browser never makes a direct request to it (avoids
  // mixed-content blocking on Vercel, and sidesteps CORS as a bonus since
  // it becomes same-origin). Framework-native, unlike vercel.json rewrites
  // — this is guaranteed to be respected by Next's own router, and also
  // applies during `next dev`, not just on Vercel.
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Restricts iframes from initiating screen capture; the exam page
          // itself needs display-capture permission for its own monitoring stream.
          { key: 'Permissions-Policy', value: 'display-capture=(self)' },
        ],
      },
    ];
  },
};

export default nextConfig;
