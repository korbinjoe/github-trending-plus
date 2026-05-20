import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env"),
});

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: [
    "@github-trending/core",
    "@github-trending/db",
    "@github-trending/github",
  ],
  experimental: {
    optimizePackageImports: [
      "drizzle-orm",
      "next-intl",
      "@github-trending/core",
    ],
  },
};

export default withNextIntl(nextConfig);
