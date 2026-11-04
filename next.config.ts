import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ship only the committed library guides with server functions
  outputFileTracingIncludes: { "/*": ["./data/guides/**/*"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
