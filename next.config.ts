import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Disable the automatic server start since we're using a custom server
  // with WebSocket support
  // Configure webpack to handle WebSocket dependencies
  webpack: (config, { isServer }) => {
    // Handle WebSocket polyfills for the browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
