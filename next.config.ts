import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/status", has: [{ type: "host", value: "status.tidelight.app" }] },
        { source: "/incidents", destination: "/status/incidents", has: [{ type: "host", value: "status.tidelight.app" }] },
        { source: "/maintenance", destination: "/status/maintenance", has: [{ type: "host", value: "status.tidelight.app" }] },
        { source: "/health", destination: "/api/system/health", has: [{ type: "host", value: "status.tidelight.app" }] },
      ],
    };
  },
  experimental: {
    useTypeScriptCli: false,
    cpus: 2,
  },
};

export default nextConfig;
