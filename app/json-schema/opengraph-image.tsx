import { renderOgCard } from "@/lib/og";
import { requireTool } from "@/lib/tools";

export { size, contentType } from "@/lib/og";

const tool = requireTool("/json-schema");
export const alt = tool.title;

export default function Image() {
  return renderOgCard({ title: tool.title, subtitle: tool.description });
}
