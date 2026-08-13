import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { getTool, tools } from "@/lib/tools";

function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe; no user input flows into these nodes.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** SoftwareApplication node for a single tool route. */
export function ToolJsonLd({ href }: { href: string }) {
  const tool = getTool(href);
  if (!tool) return null;

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: tool.title,
        description: tool.description,
        url: `${SITE_URL}${href}`,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      }}
    />
  );
}

/** WebSite + ItemList of all tools for the homepage. */
export function SiteJsonLd() {
  return (
    <JsonLd
      data={[
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_URL,
          description: SITE_DESCRIPTION,
        },
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: tools.map((tool, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${SITE_URL}${tool.href}`,
            name: tool.title,
          })),
        },
      ]}
    />
  );
}
