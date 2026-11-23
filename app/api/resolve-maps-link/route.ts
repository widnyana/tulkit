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

const ALLOWED_MAPS_RULES = [
  { host: "maps.app.goo.gl", origin: "https://maps.app.goo.gl" },
  { host: "goo.gl", origin: "https://goo.gl" },
  { host: "www.google.com", origin: "https://www.google.com" },
  { host: "google.com", origin: "https://google.com" },
  { host: "maps.google.com", origin: "https://maps.google.com" },
] as const satisfies ReadonlyArray<OriginRule>;

const HOST_ERROR = "Host is not an allowed Google Maps host";

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

  const outcome = await Effect.runPromise(
    fetchAllowed(mapsUrl, ALLOWED_MAPS_RULES, {
      headers: { "User-Agent": `Tulkit/1.0 ${SITE_URL}` },
      timeoutMs: 10000,
      maxRedirects: 5,
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
      { error: "Failed to resolve URL" },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json(
    { resolvedUrl: outcome.value.finalUrl.toString() },
    { status: 200, headers: corsHeaders },
  );
}
