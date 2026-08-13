import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/tools";

export const metadata: Metadata = buildToolMetadata("/json-schema");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
