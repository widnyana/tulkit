import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/tools";
import { ToolJsonLd } from "@/components/ToolJsonLd";

export const metadata: Metadata = buildToolMetadata("/ip-planner");

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ToolJsonLd href="/ip-planner" />
      {children}
    </>
  );
}
