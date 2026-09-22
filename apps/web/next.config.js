/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return [{ source: '/api/:path*', destination: `${api}/:path*` }];
  },
};
module.exports = nextConfig;
