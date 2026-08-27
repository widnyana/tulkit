import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { tools } from "@/lib/tools";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

/**
 * Per-tool deep guides (llms.txt documents) keyed by registry href.
 * Registering here adds a Guides entry to /llms.txt — one line per new
 * agent-ready tool.
 */
const TOOL_GUIDES: Record<string, string> = {
  "/base64": "/base64/llms.txt",
  "/qr-gen": "/qr-gen/llms.txt",
};

const guideLines = Object.entries(TOOL_GUIDES).map(([href, docPath]) => {
  const tool = tools.find((t) => t.href === href);
  if (!tool) throw new Error(`TOOL_GUIDES references unknown tool: ${href}`);
  return `- [${tool.title} usage & API](${SITE_URL}${docPath}): full how-to plus programmatic reference`;
});

const DOC = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

## Tools

${tools.map((tool) => `- [${tool.title}](${SITE_URL}${tool.href}): ${tool.description}`).join("\n")}

## Guides

${guideLines.join("\n")}

## API

POST ${SITE_URL}/api/base64 and POST ${SITE_URL}/api/qr are the current
programmatic endpoints. See each tool's guide above for its schema.
`;

export async function GET(_request: NextRequest) {
  return new NextResponse(DOC, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
