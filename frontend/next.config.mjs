/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Verification/CI builds set NEXT_DIST_DIR so `next build` can never
  // clobber the .next directory a running `next dev` is serving from
  // (that clash breaks the dev server with "Cannot find module './NNN.js'").
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
