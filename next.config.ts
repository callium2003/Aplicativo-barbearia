import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hostinger runs the application as a regular Node.js web app. Vinext emits
  // a self-contained Node server in dist/standalone when this flag is enabled.
  output: "standalone",
};

export default nextConfig;
