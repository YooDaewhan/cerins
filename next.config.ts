import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pizzip", "sharp"],
  allowedDevOrigins: ["192.168.20.232", "172.30.1.35"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
