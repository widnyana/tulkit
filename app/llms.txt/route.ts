import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { tools } from "@/lib/tools";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

/**
 * Per-tool deep guides (llms.txt documents) keyed by registry href, with the
 * tool's programmatic API endpoint (empty string = no API). Registering here
 * adds a Guides entry to /llms.txt — one line per new agent-ready tool.
 */
const TOOL_GUIDES: Record<string, { doc: string; api: string }> = {
  "/base64": { doc: "/base64/llms.txt", api: "/api/base64" },
  "/invoice": { doc: "/invoice/llms.txt", api: "/api/invoice-pdf" },
  "/qr-gen": { doc: "/qr-gen/llms.txt", api: "/api/qr" },
  "/ip-planner": { doc: "/ip-planner/llms.txt", api: "/api/ip-planner" },
  "/tire-pressure": { doc: "/tire-pressure/llms.txt", api: "" },
};

const guideLines = Object.entries(TOOL_GUIDES).map(([href, { doc, api }]) => {
  const tool = tools.find((t) => t.href === href);
  if (!tool) throw new Error(`TOOL_GUIDES references unknown tool: ${href}`);
  const apiSuffix = api
    ? `; programmatic endpoint POST ${SITE_URL}${api}`
    : "; no API — the deterministic model is documented for direct agent use";
  return `- [${tool.title} usage & API](${SITE_URL}${doc}): full how-to${apiSuffix}`;
});

const DOC = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

## Tools

${tools.map((tool) => `- [${tool.title}](${SITE_URL}${tool.href}): ${tool.description}`).join("\n")}

## Guides

${guideLines.join("\n")}
`;

export async function GET(_request: NextRequest) {
  return new NextResponse(DOC, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
