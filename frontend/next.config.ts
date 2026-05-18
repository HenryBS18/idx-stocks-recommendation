import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
  output: 'standalone',
}
export default nextConfig
