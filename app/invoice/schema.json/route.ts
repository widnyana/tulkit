import { invoiceDataSchema } from "@/lib/invoice/validation";
import { SITE_URL } from "@/lib/site";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-static";

// Generated from the same zod schema the API validates with — the machine
// readable half of /invoice/llms.txt. "input" so defaulted fields (templateKey,
// currency, separators, showBranding) stay optional and carry their default.
const SCHEMA = {
  $id: `${SITE_URL}/invoice/schema.json`,
  title: "Tulkit invoice PDF request",
  description: `JSON body for POST ${SITE_URL}/api/invoice-pdf. Also the shape of the invoice JSON the web UI imports/exports.`,
  ...z.toJSONSchema(invoiceDataSchema, { io: "input" }),
};

export async function GET(_request: NextRequest) {
  return NextResponse.json(SCHEMA);
}
