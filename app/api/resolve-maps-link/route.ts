import { corsHeaders } from "@/lib/net/cors";
import { pinnedUrl, validateOutbound } from "@/lib/net/outbound";
import { SITE_URL } from "@/lib/site";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ALLOWED_MAPS_HOSTS = [
  "maps.app.goo.gl",
  "goo.gl",
  "www.google.com",
  "google.com",
  "maps.google.com",
];

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

  const validation = validateOutbound(mapsUrl, ALLOWED_MAPS_HOSTS, HOST_ERROR);
  if ("error" in validation) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400, headers: corsHeaders },
    );
  }

  let currentUrl = validation.url;

  try {
    const initialFetchUrl = pinnedUrl(currentUrl, ALLOWED_MAPS_HOSTS);
    if (!initialFetchUrl) {
      return NextResponse.json(
        { error: HOST_ERROR },
        { status: 400, headers: corsHeaders },
      );
    }

    let response = await fetch(initialFetchUrl.toString(), {
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
      const redirectValidation = validateOutbound(
        currentUrl.toString(),
        ALLOWED_MAPS_HOSTS,
        HOST_ERROR,
      );
      if ("error" in redirectValidation) {
        return NextResponse.json(
          { error: redirectValidation.error },
          { status: 400, headers: corsHeaders },
        );
      }
      currentUrl = redirectValidation.url;

      const fetchUrl = pinnedUrl(currentUrl, ALLOWED_MAPS_HOSTS);
      if (!fetchUrl) {
        return NextResponse.json(
          { error: HOST_ERROR },
          { status: 400, headers: corsHeaders },
        );
      }

      response = await fetch(fetchUrl.toString(), {
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
