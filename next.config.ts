import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  allowedDevOrigins: ['192.168.1.21'],

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
