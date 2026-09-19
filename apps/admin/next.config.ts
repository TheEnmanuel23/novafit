import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  // This allows Next.js to resolve dependencies from the monorepo root
  turbopack: {
    root: path.join(__dirname, "../../"),
  },
};

export default nextConfig;
