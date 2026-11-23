import { SITE_URL } from "@/lib/site";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const getAllowedOrigin = (): string => {
  if (process.env.NODE_ENV === "production") {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
      SITE_URL,
    ];
    return allowedOrigins[0];
  }

  return "*";
};

const corsHeaders = {
  "Access-Control-Allow-Origin": getAllowedOrigin(),
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const ALLOWED_MAPS_HOSTS = [
  "maps.app.goo.gl",
  "goo.gl",
  "www.google.com",
  "google.com",
  "maps.google.com",
];

const checkUrl = (u: URL): string | null => {
  if (!["http:", "https:"].includes(u.protocol)) {
    return "Only HTTP and HTTPS URLs are allowed";
  }

  const hostname = u.hostname.toLowerCase();

  if (!ALLOWED_MAPS_HOSTS.includes(hostname)) {
    return "Host is not an allowed Google Maps host";
  }

  const isPrivateNetwork =
    hostname === "localhost" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
    hostname.startsWith("169.254.") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".localhost");

  if (isPrivateNetwork) {
    return "Access to private/internal networks is not allowed";
  }

  return null;
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mapsUrl = searchParams.get("url");

  if (!mapsUrl) {
    return NextResponse.json(
      { error: "Missing URL parameter" },
      { status: 400, headers: corsHeaders },
    );
  }

  let currentUrl: URL;
  try {
    currentUrl = new URL(mapsUrl);
  } catch {
    return NextResponse.json(
      { error: "Invalid URL format" },
      { status: 400, headers: corsHeaders },
    );
  }

  const initialError = checkUrl(currentUrl);
  if (initialError) {
    return NextResponse.json(
      { error: initialError },
      { status: 400, headers: corsHeaders },
    );
  }

  try {
    let response = await fetch(currentUrl.toString(), {
      headers: { "User-Agent": `Tulkit/1.0 ${SITE_URL}` },
      signal: AbortSignal.timeout(10000),
      redirect: "manual",
    });

    for (let redirects = 0; redirects < 5; redirects++) {
      if (response.status < 300 || response.status >= 400) {
        break;
      }

      const location = response.headers.get("location");
      if (!location) {
        break;
      }

      currentUrl = new URL(location, currentUrl);
      const redirectError = checkUrl(currentUrl);
      if (redirectError) {
        return NextResponse.json(
          { error: redirectError },
          { status: 400, headers: corsHeaders },
        );
      }

      response = await fetch(currentUrl.toString(), {
        headers: { "User-Agent": `Tulkit/1.0 ${SITE_URL}` },
        signal: AbortSignal.timeout(10000),
        redirect: "manual",
      });
    }

    if (response.status >= 300 && response.status < 400) {
      return NextResponse.json(
        { error: "Too many redirects" },
        { status: 400, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      { resolvedUrl: currentUrl.toString() },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Request timed out after 10 seconds" },
        { status: 408, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      { error: "Failed to resolve URL" },
      { status: 500, headers: corsHeaders },
    );
  }
}
