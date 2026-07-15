import type { NextConfig } from "next";

import { DEFAULT_API_BASE_URL } from "./src/config/environment";

/**
 * Derive the API host so next/image can optimize remotely-served assets
 * (e.g. profile photos at `${API_BASE_URL}/uploads/profile/...`).
 */
function getApiRemotePattern() {
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;

  try {
    const url = new URL(apiBaseUrl);
    return [
      {
        protocol: url.protocol.replace(":", "") as "http" | "https",
        hostname: url.hostname,
        port: url.port || undefined,
        pathname: "/uploads/**",
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  typescript: {
    // TODO: fix remaining strict TS errors across legacy CRM components
    ignoreBuildErrors: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: getApiRemotePattern(),
  },
  async redirects() {
    return [
      {
        source: "/settings/profile",
        destination: "/profile",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
