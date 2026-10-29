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
    // The isolated build runner cannot capture tsc --showConfig correctly;
    // use TypeScript's compiler API, which is also the default for TS 6+.
    useTypeScriptCli: false,\n    cpus: 2,
  },
};

export default nextConfig;
