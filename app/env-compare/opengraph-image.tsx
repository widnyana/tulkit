import { renderOgCard } from "@/lib/og";
import { getTool } from "@/lib/tools";

export { size, contentType } from "@/lib/og";

const tool = getTool("/env-compare")!;
export const alt = tool.title;

export default function Image() {
  return renderOgCard({ title: tool.title, subtitle: tool.description });
}
