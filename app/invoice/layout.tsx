import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/tools";

export const metadata: Metadata = buildToolMetadata("/invoice");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
