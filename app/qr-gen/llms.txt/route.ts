import { SITE_URL } from "@/lib/site";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

const DOC = `# QR Code Generator — tulkit

Canonical page: ${SITE_URL}/qr-gen
Generate styled QR codes as SVG: module shapes, eye patterns, gradients,
logos, watermark, size, error correction.
The web UI runs entirely in your browser. The API below is stateless and
stores nothing.

## API

Endpoint: \`POST ${SITE_URL}/api/qr\`
Content-Type: application/json
Response: \`200 {"svg": "<svg ...>...</svg>"}\` — write the svg string to a
\`.svg\` file. PNG conversion is client-side only (not exposed via API).

### Request fields

| Field | Type | Default | Notes |
| ----- | ---- | ------- | ----- |
| text | string | required | content to encode; max 2000 chars; per-version capacity applies |
| errorCorrection | LOW\\|MEDIUM\\|QUARTILE\\|HIGH | MEDIUM | higher ECC tolerates more damage but reduces capacity |
| size | integer | 512 | canvas width in pixels, 64–2048 |
| shape | square\\|circle\\|rounded\\|diamond\\|triangle\\|star | square | data-module shape |
| eyePatternShape | same set | square | three corner-eye shape |
| gap | integer 0–4 | 0 | spacing between data modules |
| eyePatternGap | integer 0–4 | 0 | spacing inside eyes |
| margin | integer 0–10 | 4 | quiet-zone border in modules; keep >= 2 for scannability |
| gradient | radial\\|linear\\|linear-vertical\\|sweep\\|conical | none | requires colors with >= 2 entries |
| colors | hex array (#rgb/#rrggbb), 1–6 items | ["#000000"] | 1 color = solid fill |
| logoImage | data:image/... or https URL | none | requires logoSize; max 100k chars |
| logoSize | integer | none | 16 to size/2 pixels; keeps center modules clear automatically |
| watermark | boolean | false | appends "Generated using ${SITE_URL}" band (+40px height) |

Scan-safety: keep dark modules dark against the white background, avoid
large gaps, and prefer QUARTILE/HIGH when styling heavily.

### Errors

All errors return \`{"error": "<message>"}\` naming the offending field.

| Status | Meaning |
| ------ | ------- |
| 400    | Invalid JSON, unknown field, bad enum/range, or text exceeding QR capacity at the chosen error-correction level |
| 405    | Method not allowed (only POST and OPTIONS) |
| 413    | Request body exceeds 1 MB |
| 500    | Unexpected server error |

CORS: fully open — any origin may call this endpoint.

### Examples

\`\`\`sh
# plain, save to file
curl -s -X POST ${SITE_URL}/api/qr \\
  -H 'Content-Type: application/json' \\
  -d '{"text":"https://tulkit.widnyana.web.id/"}' \\
  | node -e 'process.stdin.pipe(process.stdout)' # inspect {"svg": ...}

# styled: circular modules, diamond eyes, red->blue linear gradient
curl -s -X POST ${SITE_URL}/api/qr \\
  -H 'Content-Type: application/json' \\
  -d '{"text":"hello","shape":"circle","eyePatternShape":"diamond","gradient":"linear","colors":["#ff0000","#0000ff"]}'

# high-ECC, watermarked, custom size
curl -s -X POST ${SITE_URL}/api/qr \\
  -H 'Content-Type: application/json' \\
  -d '{"text":"invoice-2026-001","errorCorrection":"QUARTILE","size":1024,"watermark":true}'
\`\`\`

The interactive UI exposes additional refinements (logo upload, per-color
gradient pickers) that produce equivalent SVG client-side.
`;

export async function GET(_request: NextRequest) {
  return new NextResponse(DOC, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
