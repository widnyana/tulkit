import { BASE64_INPUT_LIMIT, BASE64_OPERATIONS } from "@/lib/base64/api";
import { SITE_URL } from "@/lib/site";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

const DOC = `# Base64 tool — tulkit

Canonical page: ${SITE_URL}/base64
Encode, decode, and inspect base64, hex, and JSON Web Tokens.
The web UI runs entirely in your browser. The API below is stateless and
stores nothing.

## Web UI

- **Encode** — UTF-8 text to base64; options for URL-safe alphabet and line wrapping.
- **Decode** — base64 text back to UTF-8 (tolerates whitespace, URL-safe alphabet, missing padding).
- **File** — encode a local file to base64 or save a data-URL back to a file. Binary handling is UI-only (browser file upload); agents should base64 binaries locally.
- **JWT** — decode a JWT's header/payload/signature. Decoding is NOT verification: no signature check is performed.
- **Hex** — convert between hex strings and base64.

## API

Endpoint: \`POST ${SITE_URL}/api/base64\`
Content-Type: application/json

### Request

\`\`\`json
{
  "operation": "encode",
  "input": "hello",
  "options": { "urlSafe": false, "lineWrap": 0 }
}
\`\`\`

- **operation** (required): one of ${BASE64_OPERATIONS.join(", ")}
- **input** (required): string, max ${BASE64_INPUT_LIMIT} characters
- **options** (optional, encode only):
  - \`urlSafe\` (boolean): use the URL-safe alphabet (- and _) with no padding. Default false.
  - \`lineWrap\` (integer >= 0): wrap encoded output every N characters; 0 = single line. Default 0.

Response: \`200 {"output": "<string>"}\`
- \`encode\`/\`decode\`: the converted text
- \`hexToBase64\`/\`base64ToHex\`: the converted string
- \`jwtDecode\`: pretty-printed JSON object \`{header, payload, signature}\`

### Errors

All errors return \`{"error": "<message>"}\`.

| Status | Meaning |
| ------ | ------- |
| 400    | Invalid JSON body, unknown operation, non-string input, input over limit, or undecodable input |
| 405    | Method not allowed (only POST and OPTIONS are supported) |
| 413    | Request body exceeds 1 MB |
| 500    | Unexpected server error |

### Examples

\`\`\`sh
# encode with URL-safe alphabet
curl -s -X POST ${SITE_URL}/api/base64 \\
  -H 'Content-Type: application/json' \\
  -d '{"operation":"encode","input":"hello","options":{"urlSafe":true}}'

# decode
curl -s -X POST ${SITE_URL}/api/base64 \\
  -H 'Content-Type: application/json' \\
  -d '{"operation":"decode","input":"aGVsbG8="}'

# inspect a JWT (no signature verification)
curl -s -X POST ${SITE_URL}/api/base64 \\
  -H 'Content-Type: application/json' \\
  -d '{"operation":"jwtDecode","input":"<your.jwt.token>"}'
\`\`\`

CORS: fully open — any origin may call this endpoint.
`;

export async function GET(_request: NextRequest) {
  return new NextResponse(DOC, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
