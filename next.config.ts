import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // "standalone" bundles only the files needed to run the server,
  // producing a self-contained output at .next/standalone.
  // This is what makes the Docker runner stage so lean — no full
  // node_modules directory needed at runtime.
  output: 'standalone',
};

export default nextConfig;
