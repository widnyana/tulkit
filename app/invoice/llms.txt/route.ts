import { SITE_URL } from "@/lib/site";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

const DOC = `# Invoice Generator — tulkit

Canonical page: ${SITE_URL}/invoice
Render professional invoice PDFs from structured JSON: five templates,
line items, tax, currency formatting, base64 logo and QR code.
The web UI runs entirely in your browser. The API renders server-side; it is
stateless, unauthenticated, and stores nothing.

## Web UI

- **Form** — sender/recipient, line items, tax, currency separators, payment info; live PDF preview.
- **Templates** — default, stripe, apex, granite, evergreen.
- **Export JSON** — downloads the current form state as \`invoice-<number>.json\`.
- **Import JSON** — loads a JSON dump back into the form for editing. A UI
  export is a valid API request body, and vice versa — draft the JSON, POST it
  for a PDF, and hand the same file to a human for editing in the UI.

## Templates

\`templateKey\` picks the visual style; layout and data are identical across
templates. When unsure, use \`default\`. Rendering differences:

| templateKey | Look | Choose when |
| ----------- | ---- | ----------- |
| \`default\` | Classic layout: large blue centered "INVOICE" heading, blue invoice number, two-column sender/recipient block, plain bordered items table with a blue-accented totals area. The neutral reference look. | You want a safe, conventional business invoice; the others don't fit. |
| \`stripe\` | Stripe-style minimalism: thin purple (#635BFF) accent bar across the top edge, navy (#0A2540) text, small uppercase gray labels, flat unboxed tables, generous whitespace. | You want a clean, modern, low-ink SaaS-style invoice. Most understated option. |
| \`apex\` | Warm & energetic: thin coral (#FF6B6B) accent bar on top, large charcoal headings with coral accents, uppercase gray section labels on a warm white page. Bolder type hierarchy than stripe. | You want a friendly, expressive invoice with personality without losing legibility. |
| \`granite\` | Corporate ledger: full-width dark blue-gray (#2C3E50) header block with white uppercase title and logo inside, light-on-dark table header row, fixed footer with page numbers. Heaviest, most formal look. | You want a serious, formal, "big company" invoice — consulting, agencies, enterprise. |
| \`evergreen\` | Teal ledger tuned for long multi-page invoices: evergreen ink with mint washes, amber "Total Due", rows never split across page breaks, and continuation pages carry a fixed "INVOICE #N — CONTINUED" band plus footer. | Many line items (multi-page PDFs), or a calm teal brand look. |

## API

Endpoint: \`POST ${SITE_URL}/api/invoice-pdf\`
Content-Type: application/json
Response: \`200 application/pdf\` — the rendered PDF bytes, plus
\`Content-Disposition: attachment; filename="invoice-<invoiceNumber>.pdf"\`
(non-alphanumeric characters in the number become \`_\`).
Schema: \`${SITE_URL}/invoice/schema.json\` — JSON Schema 2020-12, generated
from the validator itself, so it always matches what the endpoint accepts.
The table below is the human summary of that schema.

### Request fields

| Field | Type | Default | Notes |
| ----- | ---- | ------- | ----- |
| sender | object | required | \`{ name, address, email, phone }\` — name, address, phone required and non-empty; email optional: empty string or a valid address |
| recipient | object | required | \`{ name, address, email?, phone? }\` — name and address required and non-empty; email, if given, must parse or be \`""\` |
| invoiceNumber | string | required | non-empty |
| issueDate | string | required | yyyy-mm-dd, e.g. "2025-06-01" |
| dueDate | string | required | yyyy-mm-dd, e.g. "2025-06-08" |
| items | array | required | each: \`{ id, description, quantity, unitPrice, notes? }\` — \`id\` is a required string, \`description\` non-empty, \`quantity\` and \`unitPrice\` numbers >= 0 |
| taxEnabled | boolean | required | |
| taxRate | number | required | percent, 0–100 |
| templateKey | string | "default" | one of: default, stripe, apex, granite, evergreen |
| currency | string | "$" | 1–3 characters — a symbol, not an ISO code ("$", "€", "Rp") |
| decimalSeparator | string | "," | exactly 1 character |
| thousandSeparator | string | "." | exactly 1 character |
| notes | string | — | footer notes |
| logo | string | — | base64 image data URI, see Images |
| paymentInfo | object | — | \`{ bankName?, accountNumber?, routingCode?, paymentMethods?, paymentQRCode? }\` — \`paymentMethods\` is an array of up to 20 strings, \`paymentQRCode\` a base64 image data URI (see Images) |
| showBranding | boolean | true | footer "generated with <host>"; only an explicit false hides it |

Length caps: names 500, addresses 1000, emails 320, phones 50, invoiceNumber
100, item description and notes 2000 each, invoice notes 5000, items 500
entries. Exceeding any cap is a 400.

Unknown fields are dropped, not rejected — a UI export with extra keys still
renders.

### Three ways to get a 400

1. **Omitting \`items[].id\`.** It is required. Use \`"1"\`, \`"2"\`, … if you have nothing better.
2. **Omitting \`taxRate\` when \`taxEnabled\` is false.** Both fields are always required; send \`"taxRate": 0\`.
3. **Dates in any format but \`yyyy-mm-dd\`.** "01/06/2025" and ISO timestamps are rejected.

### Images

\`logo\` and \`paymentInfo.paymentQRCode\` accept a base64 data URI only —
\`data:image/png;base64,...\` with png, jpeg, jpg, or webp. Remote http(s) URLs
are rejected: the PDF renderer would fetch them server-side, which would make
this endpoint an SSRF proxy. Empty string means "not provided". Hard limit is
2,800,000 characters of data URI, but the 2 MB body cap below binds first.

### Totals

Do not send totals — there are no such fields. The renderer computes
\`subtotal = sum(quantity × unitPrice)\`, \`tax = subtotal × taxRate / 100\`
when \`taxEnabled\` is true (otherwise 0), and \`total = subtotal + tax\`.
Every amount prints to 2 decimals using your separators.

### Errors

Errors return \`{"error": "<message>"}\`; validation failures also include
\`"issues": [{"path": "items.0.id", "message": "..."}]\` naming every
offending field. The 405 is Next.js's own and has an empty body.

| Status | Meaning |
| ------ | ------- |
| 400    | Invalid JSON body, or schema validation failed (with issues array) |
| 405    | Method not allowed (only POST and OPTIONS) |
| 413    | Declared Content-Length exceeds 2 MB (logo/QR data URIs are the pressure case) |
| 500    | PDF rendering failed |

### Examples

\`\`\`sh
# minimal invoice, save the PDF
curl -s --fail-with-body -X POST ${SITE_URL}/api/invoice-pdf \\
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

# granite template, euros, no tax, with payment details
curl -s --fail-with-body -X POST ${SITE_URL}/api/invoice-pdf \\
  -H 'Content-Type: application/json' \\
  -d '{
    "sender": {"name":"Northwind Studio","address":"742 Evergreen Terrace, Portland","email":"billing@northwind.example","phone":"+1 555 0100"},
    "recipient": {"name":"Acme GmbH","address":"Hauptstrasse 1, Berlin","email":"ap@acme.example"},
    "invoiceNumber": "INV-2025-002",
    "issueDate": "2025-06-01",
    "dueDate": "2025-07-01",
    "items": [
      {"id":"1","description":"Retainer, June","quantity":1,"unitPrice":4200},
      {"id":"2","description":"On-call hours","quantity":6,"unitPrice":150,"notes":"Outside business hours"}
    ],
    "taxEnabled": false,
    "taxRate": 0,
    "templateKey": "granite",
    "currency": "€",
    "decimalSeparator": ",",
    "thousandSeparator": ".",
    "notes": "Payment due within 30 days.",
    "paymentInfo": {"bankName":"Example Bank","accountNumber":"DE00 1234 5678 9012","routingCode":"EXAMPLEXXX","paymentMethods":["Bank Transfer"]}
  }' -o invoice.pdf
\`\`\`

\`--fail-with-body\` matters: without it curl writes the JSON error into
\`invoice.pdf\` and exits 0.

CORS: fully open — any origin may call this endpoint.
`;

export async function GET(_request: NextRequest) {
  return new NextResponse(DOC, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
