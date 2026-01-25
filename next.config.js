/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ["masteraset.com"] }
  }
};
export default nextConfig;
