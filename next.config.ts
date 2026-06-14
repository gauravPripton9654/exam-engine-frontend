import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack is the default in Next.js 16.
  // face-api.js and TensorFlow are loaded dynamically inside browser-only
  // useEffect callbacks, so no special module-resolution overrides are needed.
  turbopack: {},
};

export default nextConfig;
