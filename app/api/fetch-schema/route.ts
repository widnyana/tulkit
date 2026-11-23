import { corsHeaders } from "@/lib/net/cors";
import { pinnedUrl, validateOutbound } from "@/lib/net/outbound";
import { SITE_URL } from "@/lib/site";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Restrict outbound schema fetches to trusted hosts only (server-controlled)
const ALLOWED_SCHEMA_HOSTS = (
  process.env.ALLOWED_SCHEMA_HOSTS?.split(",") || [
    new URL(SITE_URL).hostname,
    "raw.githubusercontent.com",
    "gist.githubusercontent.com",
    "json.schemastore.org",
    "www.schemastore.org",
  ]
)
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);

const HOST_ERROR = "Host is not in the allowed schema host list";

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
    const validation = validateOutbound(
      schemaUrl,
      ALLOWED_SCHEMA_HOSTS,
      HOST_ERROR,
    );
    if ("error" in validation) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400, headers: corsHeaders },
      );
    }

    // Validate content length limit (prevent DoS)
    const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB

    // Follow redirects manually so each hop is re-validated
    let currentUrl = validation.url;
    const initialFetchUrl = pinnedUrl(currentUrl, ALLOWED_SCHEMA_HOSTS);
    if (!initialFetchUrl) {
      return NextResponse.json(
        { error: HOST_ERROR },
        { status: 400, headers: corsHeaders },
      );
    }

    let response = await fetch(initialFetchUrl.toString(), {
      headers: {
        "User-Agent": `Tulkit/1.0 ${SITE_URL}`,
        Accept: "application/json, application/schema+json, */*",
      },
      // Set a timeout to prevent hanging
      signal: AbortSignal.timeout(10000),
      redirect: "manual",
    });

    for (let redirects = 0; redirects < 3; redirects++) {
      if (response.status < 300 || response.status >= 400) {
        break;
      }

      const location = response.headers.get("location");
      if (!location) {
        break;
      }

      currentUrl = new URL(location, currentUrl);
      const redirectValidation = validateOutbound(
        currentUrl.toString(),
        ALLOWED_SCHEMA_HOSTS,
        HOST_ERROR,
      );
      if ("error" in redirectValidation) {
        return NextResponse.json(
          { error: redirectValidation.error },
          { status: 400, headers: corsHeaders },
        );
      }
      currentUrl = redirectValidation.url;

      const fetchUrl = pinnedUrl(currentUrl, ALLOWED_SCHEMA_HOSTS);
      if (!fetchUrl) {
        return NextResponse.json(
          { error: HOST_ERROR },
          { status: 400, headers: corsHeaders },
        );
      }

      response = await fetch(fetchUrl.toString(), {
        headers: {
          "User-Agent": `Tulkit/1.0 ${SITE_URL}`,
          Accept: "application/json, application/schema+json, */*",
        },
        // Set a timeout to prevent hanging
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
