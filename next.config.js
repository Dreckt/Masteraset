/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

if (process.env.NODE_ENV === "development") {
  // ESM-safe dynamic import so Cloudflare request context works during `next dev`
  const mod = await import("@cloudflare/next-on-pages/next-dev");
  mod.setupDevPlatform();
}

export default nextConfig;
