/** @type {import('next').NextConfig} */
const nextConfig = {
  // otoroku-api は API routes のみ。画像最適化等は不要
  images: { unoptimized: true },
};

module.exports = nextConfig;
