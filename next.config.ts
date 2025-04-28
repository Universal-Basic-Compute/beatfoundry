import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
    KINOS_API_KEY: process.env.KINOS_API_KEY,
    KINOS_API_BASE_URL: process.env.KINOS_API_BASE_URL || 'https://api.kinos-engine.ai/v2',
    KINOS_BLUEPRINT_ID: process.env.KINOS_BLUEPRINT_ID || 'kinos',
  },
};

export default nextConfig;
