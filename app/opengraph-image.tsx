import { renderOgCard } from "@/lib/og";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/site";

export { size, contentType } from "@/lib/og";
export const alt = SITE_TITLE;

export default function Image() {
  return renderOgCard({
    title: "tulkit",
    subtitle: SITE_DESCRIPTION,
  });
}
