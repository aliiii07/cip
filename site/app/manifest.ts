import type { MetadataRoute } from "next";

/**
 * Served at /manifest.webmanifest. Next wires the <link rel="manifest"> tag
 * automatically from this file.
 *
 * The tab and touch icons are declared in app/layout.tsx metadata (public/
 * favicon.svg, favicon.ico, favicon-16x16.png, favicon-32x32.png,
 * apple-touch-icon.png); these two entries are the larger raster sizes Android
 * and installed-app surfaces use. All are generated from the same mark.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "C.I.P · Capital Investment Prospects",
    short_name: "C.I.P",
    description:
      "Decision intelligence for what comes next. A no-code quantitative sandbox and analytical research suite.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
