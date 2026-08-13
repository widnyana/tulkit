import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/tools";
import { ToolJsonLd } from "@/components/ToolJsonLd";

export const metadata: Metadata = buildToolMetadata("/json-schema");

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ToolJsonLd href="/json-schema" />
      {children}
    </>
  );
}
