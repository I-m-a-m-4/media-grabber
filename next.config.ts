import type { NextConfig } from 'next';

const isTauri = process.env.NEXT_PUBLIC_TAURI === '1';

const nextConfig: NextConfig = {
  // When building for Tauri, we need a static export
  output: isTauri ? 'export' : undefined,
  // Tauri expects the static files in a specific directory
  distDir: isTauri ? 'dist' : '.next',
  // Ignore route.ts (API routes) during Tauri build since they can't be exported
  pageExtensions: isTauri ? ['tsx', 'jsx'] : ['tsx', 'ts', 'jsx', 'js'],
  // Required for static export
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
