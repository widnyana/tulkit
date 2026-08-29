import {
  parseIpPlannerRequest,
  runIpPlannerOperation,
} from "@/lib/ip-planner/api";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Open by design: stateless, no credentials or user data, size-capped.
// Browser agents on any origin get read access; non-browser agents
// (curl, scripts) ignore CORS anyway.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const MAX_BODY_BYTES = 1_000_000; // 1 MB

const jsonError = (status: number, error: string) =>
  new NextResponse(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return jsonError(413, "Request body too large");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  try {
    const parsed = parseIpPlannerRequest(body);
    const result = runIpPlannerOperation(parsed);
    return new NextResponse(JSON.stringify({ result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    // All throws from parse/dispatch are input-value errors by construction.
    const message =
      error instanceof Error ? error.message : "Failed to process request";
    return jsonError(400, message);
  }
}

export function GET() {
  return new NextResponse(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      Allow: "POST, OPTIONS",
    },
  });
}
