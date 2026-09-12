import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { getPublicSupabaseConfig } from "./utils/supabase-config";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const supabaseUrl = new URL(getPublicSupabaseConfig().url);

const nextConfig: NextConfig = {
  output: process.env.BARBEARIASP_BUILD_TARGET === "hostinger" ? "standalone" : undefined,
  outputFileTracingRoot: projectRoot,
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseUrl.hostname,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
