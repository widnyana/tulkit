import { corsHeaders } from "@/lib/net/cors";
import {
  fetchAllowed,
  type OutboundError,
  type OriginRule,
} from "@/lib/net/outbound";
import { SITE_URL } from "@/lib/site";
import { Effect } from "effect";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SITE_ORIGIN = new URL(SITE_URL);

const ALLOWED_SCHEMA_RULES = [
  {
    host: SITE_ORIGIN.hostname.toLowerCase(),
    origin: SITE_ORIGIN.origin,
  },
  {
    host: "raw.githubusercontent.com",
    origin: "https://raw.githubusercontent.com",
  },
  {
    host: "gist.githubusercontent.com",
    origin: "https://gist.githubusercontent.com",
  },
  {
    host: "json.schemastore.org",
    origin: "https://json.schemastore.org",
  },
  {
    host: "www.schemastore.org",
    origin: "https://www.schemastore.org",
  },
] as const satisfies ReadonlyArray<OriginRule>;

const HOST_ERROR = "Host is not in the allowed schema host list";

const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB

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

  const outcome = await Effect.runPromise(
    fetchAllowed(schemaUrl, ALLOWED_SCHEMA_RULES, {
      headers: {
        "User-Agent": `Tulkit/1.0 ${SITE_URL}`,
        Accept: "application/json, application/schema+json, */*",
      },
      timeoutMs: 10000,
      maxRedirects: 3,
      hostError: HOST_ERROR,
    }).pipe(
      Effect.match({
        onFailure: (error: OutboundError) => ({ ok: false as const, error }),
        onSuccess: (value) => ({ ok: true as const, value }),
      }),
    ),
  );

  if (!outcome.ok) {
    const { error } = outcome;

    if (error._tag === "BlockedTarget") {
      return NextResponse.json(
        { error: error.reason },
        { status: 400, headers: corsHeaders },
      );
    }

    if (error._tag === "TooManyRedirects") {
      return NextResponse.json(
        { error: "Too many redirects" },
        { status: 400, headers: corsHeaders },
      );
    }

    if (error._tag === "RequestTimeout") {
      return NextResponse.json(
        { error: "Request timed out after 10 seconds" },
        { status: 408, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch schema" },
      { status: 500, headers: corsHeaders },
    );
  }

  const { response } = outcome.value;

  if (!response.ok) {
    return NextResponse.json(
      { error: `HTTP ${response.status}: ${response.statusText}` },
      { status: response.status, headers: corsHeaders },
    );
  }

  // Check content length before processing
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number.parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
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
}
