import { SITE_URL } from "@/lib/site";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

const DOC = `# Invoice Generator — tulkit

Canonical page: ${SITE_URL}/invoice
Render professional invoice PDFs from structured JSON: five templates,
line items, tax, currency formatting, base64 logo and QR code.
The web UI runs entirely in your browser. The API below is stateless and
stores nothing.

## Web UI

- **Form** — sender/recipient, line items, tax, currency separators, payment info; live PDF preview.
- **Templates** — default, stripe, apex, granite, evergreen.
- **Export JSON** — downloads the current form state as \`invoice-<number>.json\`.
- **Import JSON** — loads a JSON dump back into the form for editing. A UI
  export is a valid API request body, and vice versa — agents can draft the
  JSON locally, POST it for a PDF, and share the same file with a human for
  editing in the UI.

## API

Endpoint: \`POST ${SITE_URL}/api/invoice-pdf\`
Content-Type: application/json
Response: \`200 application/pdf\` — the rendered PDF bytes, ready to save.

### Request fields

| Field | Type | Default | Notes |
| ----- | ---- | ------- | ----- |
| sender | object | required | \`{ name, address, email, phone }\` — all non-empty strings, email must be valid |
| recipient | object | required | \`{ name, address, email?, phone? }\` — email (if present) must be valid or empty string |
| invoiceNumber | string | required | non-empty |
| issueDate | string | required | yyyy-mm-dd, e.g. "2025-06-01" |
| dueDate | string | required | yyyy-mm-dd, e.g. "2025-06-08" |
| items | array | required | each: \`{ id: string, description: string (non-empty), quantity: number >= 0, unitPrice: number >= 0, notes?: string }\` |
| taxEnabled | boolean | required | |
| taxRate | number | required | 0–100 |
| templateKey | default\\|stripe\\|apex\\|granite\\|evergreen | default | PDF layout |
| currency | string (1–3 chars) | "$" | currency symbol |
| decimalSeparator | string (1 char) | "," | |
| thousandSeparator | string (1 char) | "." | |
| notes | string | — | footer notes |
| logo | base64 image data URI | — | \`data:image/(png|jpeg|jpg|webp);base64,...\` — remote http(s) URLs are rejected (SSRF guard); max ~2MB decoded |
| showBranding | boolean | true | footer "generated with <host>" |
| paymentInfo | object | — | \`{ bankName?, accountNumber?, routingCode?, paymentMethods?: string[], paymentQRCode? }\` — paymentQRCode is a base64 image data URI (same rules as logo); paymentMethods capped at 20 |

Length caps: names 500, addresses 1000, descriptions 2000, notes 5000,
invoiceNumber 100, items max 500 entries. Exceeding any cap is a validation error.

### Errors

Errors return \`{"error": "<message>"}\`; validation failures also include
\`"issues": [{"path": "...", "message": "..."}]\` naming every offending field.

| Status | Meaning |
| ------ | ------- |
| 400    | Invalid JSON body, or schema validation failed (with issues array) |
| 405    | Method not allowed (only POST and OPTIONS) |
| 413    | Request body exceeds 2 MB (logo/QR data URIs are the pressure case) |
| 500    | Unexpected server error |

CORS: fully open — any origin may call this endpoint.

### Examples

\`\`\`sh
# minimal invoice, save the PDF
curl -s -X POST ${SITE_URL}/api/invoice-pdf \\
  -H 'Content-Type: application/json' \\
  -d '{
    "sender": {"name":"Northwind Studio","address":"742 Evergreen Terrace, Portland","email":"billing@northwind.example","phone":"+1 555 0100"},
    "recipient": {"name":"Acme Corp","address":"1 Acme Way, Springfield"},
    "invoiceNumber": "INV-2025-001",
    "issueDate": "2025-06-01",
    "dueDate": "2025-06-08",
    "items": [{"id":"1","description":"Design work","quantity":10,"unitPrice":85}],
    "taxEnabled": true,
    "taxRate": 11
  }' -o invoice.pdf

# granite template, euros
curl -s -X POST ${SITE_URL}/api/invoice-pdf \\
  -H 'Content-Type: application/json' \\
  -d '{"sender":{...},"recipient":{...},"invoiceNumber":"INV-002","issueDate":"2025-06-01","dueDate":"2025-06-08","items":[...],"taxEnabled":false,"taxRate":0,"templateKey":"granite","currency":"€"}' \\
  -o invoice.pdf
\`\`\`

The interactive UI additionally supports importing/exporting the JSON dump
for round-trip editing; the API is a superset-compatible subset (same schema).
`;

export async function GET(_request: NextRequest) {
  return new NextResponse(DOC, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
