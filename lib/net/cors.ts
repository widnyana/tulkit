import { SITE_URL } from "@/lib/site";

const getAllowedOrigin = (): string => {
  if (process.env.NODE_ENV === "production") {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
      SITE_URL,
    ];
    return allowedOrigins[0];
  }

  return "*";
};

export const corsHeaders = {
  "Access-Control-Allow-Origin": getAllowedOrigin(),
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};
