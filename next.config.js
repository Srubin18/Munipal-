/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // For PDF uploads
    },
  },
};

module.exports = nextConfig;
