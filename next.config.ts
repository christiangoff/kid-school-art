import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image on the Raspberry Pi.
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
