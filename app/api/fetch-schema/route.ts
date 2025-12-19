import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const schemaUrl = searchParams.get("url");

  if (!schemaUrl) {
    return NextResponse.json(
      { error: "Missing URL parameter" },
      { status: 400 },
    );
  }

  try {
    // Validate URL format
    const urlObj = new URL(schemaUrl);
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return NextResponse.json(
        { error: "Only HTTP and HTTPS URLs are allowed" },
        { status: 400 },
      );
    }

    // Fetch the schema
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
        { status: response.status },
      );
    }

    const text = await response.text();

    // Validate that it's valid JSON
    try {
      JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "The URL did not return valid JSON" },
        { status: 400 },
      );
    }

    // Return the schema content
    return NextResponse.json({ content: text }, { status: 200 });
  } catch (error) {
    console.error("Error fetching schema:", error);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return NextResponse.json(
          { error: "Request timed out after 10 seconds" },
          { status: 408 },
        );
      }
      if (error.message.includes("Invalid URL")) {
        return NextResponse.json(
          { error: "Invalid URL format" },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "Failed to fetch schema" },
      { status: 500 },
    );
  }
}
