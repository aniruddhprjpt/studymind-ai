import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mammoth", "officeparser"],
  devIndicators: false,
};

export default nextConfig;
