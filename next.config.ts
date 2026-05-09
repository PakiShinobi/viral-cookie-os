import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    // Podcast video uploads can comfortably exceed the 1MB default body
    // limit. 4GB ceiling is plenty for an hour-long 4K source.
    serverActions: {
      bodySizeLimit: "4gb",
    },
  },
  // Don't track ffmpeg-static / ffprobe-static binaries — they live
  // outside Next's tracing graph anyway and bundling them confuses
  // the build.
  serverExternalPackages: ["ffmpeg-static", "ffprobe-static"],
};

export default nextConfig;
