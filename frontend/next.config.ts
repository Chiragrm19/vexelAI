import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/vexelAI',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
