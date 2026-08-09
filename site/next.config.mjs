/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Verification/CI builds set NEXT_DIST_DIR so `next build` can never clobber
  // the .next directory a running `next dev` is serving from.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
