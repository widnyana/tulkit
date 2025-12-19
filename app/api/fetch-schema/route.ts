import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// CORS configuration - more secure for production
const getAllowedOrigin = (): string => {
  // In production, restrict to specific origins
  if (process.env.NODE_ENV === "production") {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
      "https://tulkit.widnyana.web.id",
    ];
    return allowedOrigins[0]; // Return the first allowed origin
  }

  // In development, allow all origins
  return "*";
};

const corsHeaders = {
  "Access-Control-Allow-Origin": getAllowedOrigin(),
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const schemaUrl = searchParams.get("url");

  if (!schemaUrl) {
    return NextResponse.json(
      { error: "Missing URL parameter" },
      { status: 400, headers: corsHeaders },
    );
  }

  try {
    // Validate URL format and prevent dangerous URLs
    let urlObj: URL | undefined;
    try {
      urlObj = new URL(schemaUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400, headers: corsHeaders },
      );
    }

    // Only allow HTTP/HTTPS and block private/internal networks
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return NextResponse.json(
        { error: "Only HTTP and HTTPS URLs are allowed" },
        { status: 400, headers: corsHeaders },
      );
    }

    // Block private/internal network ranges
    const hostname = urlObj.hostname;
    const isPrivateNetwork =
      hostname === "localhost" ||
      hostname.startsWith("127.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) || // 172.16-31.x.x
      hostname.startsWith("169.254.") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".localhost");

    if (isPrivateNetwork) {
      return NextResponse.json(
        { error: "Access to private/internal networks is not allowed" },
        { status: 400, headers: corsHeaders },
      );
    }

    // Validate content length limit (prevent DoS)
    const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB
    const response = await fetch(schemaUrl, {
      headers: {
        "User-Agent": "Tulkit/1.0 https://tulkit.widnyana.web.id",
        Accept: "application/json, application/schema+json, */*",
      },
      // Set a timeout to prevent hanging
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `HTTP ${response.status}: ${response.statusText}` },
        { status: response.status, headers: corsHeaders },
      );
    }

    // Check content length before processing
    const contentLength = response.headers.get("content-length");
    if (
      contentLength &&
      Number.parseInt(contentLength, 10) > MAX_RESPONSE_SIZE
    ) {
      return NextResponse.json(
        { error: "Response too large (max 10MB)" },
        { status: 413, headers: corsHeaders },
      );
    }

    const text = await response.text();

    // Enforce size limit
    if (text.length > MAX_RESPONSE_SIZE) {
      return NextResponse.json(
        { error: "Response too large (max 10MB)" },
        { status: 413, headers: corsHeaders },
      );
    }

    // Validate that it's valid JSON and not obviously malicious
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "The URL did not return valid JSON" },
        { status: 400, headers: corsHeaders },
      );
    }

    // Basic safety check - reject obviously dangerous content
    const jsonStr = JSON.stringify(parsed);
    if (jsonStr.length > MAX_RESPONSE_SIZE) {
      return NextResponse.json(
        { error: "JSON too large after parsing (max 10MB)" },
        { status: 413, headers: corsHeaders },
      );
    }

    // Return schema content
    return NextResponse.json(
      { content: text },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    console.error("Error fetching schema:", error);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return NextResponse.json(
          { error: "Request timed out after 10 seconds" },
          { status: 408, headers: corsHeaders },
        );
      }
      // Don't expose internal error details to client for security
      return NextResponse.json(
        { error: "Failed to fetch schema" },
        { status: 500, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch schema" },
      { status: 500, headers: corsHeaders },
    );
  }
}
