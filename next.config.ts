import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
    KINOS_API_KEY: process.env.KINOS_API_KEY,
  },
};

export default nextConfig;
