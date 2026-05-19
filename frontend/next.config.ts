import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
  output: process.env.VERCEL === 'true' ? undefined : 'standalone',
}
export default nextConfig
