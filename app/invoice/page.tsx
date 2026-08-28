"use client";

import {
  createDefaultInvoiceData,
  mergeInvoiceWithDefaults,
} from "@/lib/invoice/defaults";
import { exportInvoiceJson, loadInvoice } from "@/lib/invoice/storage";
import type { InvoiceData } from "@/lib/invoice/types";
import { invoiceDataSchema } from "@/lib/invoice/validation";
import { FileDown, FileUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "./components/ui/button";
import InvoiceDownloadButton from "./components/InvoiceDownloadButton";
import InvoiceForm from "./components/InvoiceForm";
import InvoicePDFPreview from "./components/InvoicePDFPreview";
import Link from "next/link";

const InvoicePage = () => {
  const [invoiceData, setInvoiceData] = useState<InvoiceData>(
    createDefaultInvoiceData,
  );
  const [isLoading, setIsLoading] = useState(true);
  // Bumped on JSON import so InvoiceForm remounts with the imported data —
  // react-hook-form owns its state after mount and ignores parent updates.
  const [formVersion, setFormVersion] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJson = () => {
    try {
      exportInvoiceJson(invoiceData);
      toast.success("Invoice JSON downloaded");
    } catch {
      toast.error("Could not download invoice JSON");
    }
  };

  const handleImportJson = async (file: File) => {
    try {
      const parsed = invoiceDataSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) {
        toast.error(
          `Invalid invoice file: ${parsed.error.issues[0]?.message ?? "unknown error"}`,
        );
        return;
      }
      // Single merge node — same one the mount-restore path uses.
      setInvoiceData((prev) => mergeInvoiceWithDefaults(prev, parsed.data));
      toast.success("Invoice imported");
      setFormVersion((v) => v + 1);
    } catch {
      toast.error("Could not read file as JSON");
    }
  };

  useEffect(() => {
    // Load saved data from localStorage when component mounts
    const savedData = loadInvoice();
    if (savedData) {
      setInvoiceData((prev) => mergeInvoiceWithDefaults(prev, savedData));
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-label="Back arrow"
          >
            <title>Back to Home</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Home
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          Invoice Generator
        </h1>
        <p className="sr-only">
          Generate clean, professional invoice PDFs for freelance work, side
          projects, or whatever needs a paper trail. Customize sender/recipient
          details, line items, tax rates, currency formatting, and payment info
          — then export directly to PDF. The invoice layout is your standard
          professional format, not some avant-garde designer experiment. All
          data stays in your browser; nothing gets sent to a server.
        </p>

        <div className="flex gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={handleExportJson}>
            <FileDown className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="w-4 h-4 mr-2" />
            Import JSON
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportJson(file);
              e.target.value = "";
            }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-150px)]">
          <div className="bg-card rounded-lg shadow-md overflow-y-auto">
            <InvoiceForm
              key={formVersion}
              initialData={invoiceData}
              onDataChange={setInvoiceData}
            />
          </div>

          <div className="flex flex-col bg-card rounded-lg shadow-md">
            <div className="flex-grow h-[calc(100%-80px)]">
              <InvoicePDFPreview invoiceData={invoiceData} />
            </div>
            <InvoiceDownloadButton invoiceData={invoiceData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePage;
