import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mammoth", "officeparser"],
  devIndicators: false,
};

export default nextConfig;
