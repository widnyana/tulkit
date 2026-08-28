import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { InvoiceDocument } from "@/app/invoice/invoice-document";
import { invoiceDataSchema } from "@/lib/invoice/validation";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Open by design: stateless, no credentials or user data, size-capped.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

// ponytail: 2MB flat cap — logo/paymentQRCode data URIs are the pressure case
const MAX_BODY_BYTES = 2_000_000;

const jsonError = (status: number, body: Record<string, unknown>) =>
  new NextResponse(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// @react-pdf/renderer uses dynamic requires (font engine, cmaps) that break
// when bundled — keep it external to the server bundle.
export const runtime = "nodejs";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return jsonError(413, { error: "Request body too large" });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, { error: "Invalid JSON body" });
  }

  const parsed = invoiceDataSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, {
      error: "Validation failed",
      issues: parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
  }

  try {
    const buffer = await renderToBuffer(
      createElement(InvoiceDocument, {
        invoiceData: parsed.data,
      }) as ReactElement<DocumentProps>,
    );
    // invoiceNumber is attacker-controlled at this endpoint — strip it down
    // before it lands in a response header (Node throws ERR_INVALID_CHAR on
    // \n etc., killing the connection instead of returning a clean response).
    const safeName =
      parsed.data.invoiceNumber.replace(/[^A-Za-z0-9._-]/g, "_") || "untitled";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${safeName}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Invoice PDF render failed", err);
    return jsonError(500, { error: "Failed to render PDF" });
  }
}
