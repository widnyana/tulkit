"use client";

import { AlertCircleIcon } from "lucide-react";
import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { InvoiceClientPage } from "./components/invoice-client";
import { InvoicePDFDownloadLink } from "./components/invoice-pdf-download-link";
import { Button } from "./components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";

import type { InvoiceData } from "@/lib/invoice/types";
import { INITIAL_INVOICE_DATA } from "./constants";
import {
  compressInvoiceData,
  decompressInvoiceData,
} from "./utils/url-compression";

export function InvoicePageClient() {
  const searchParams = useSearchParams();

  const urlTemplateSearchParam = searchParams.get("template");

  // Validate template parameter with zod
  const templateValidation = z
    .enum(SUPPORTED_TEMPLATES)
    .default("default")
    .safeParse(urlTemplateSearchParam);

  // Simple device detection (mobile if screen width < 1024px)
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const [invoiceDataState, setInvoiceDataState] = useState<InvoiceData | null>(
    null,
  );

  const [errorWhileGeneratingPdfIsShown, setErrorWhileGeneratingPdfIsShown] =
    useState(false);

  const [canShareInvoice, setCanShareInvoice] = useState(true);

  // Helper function to load from localStorage
  const loadFromLocalStorage = useCallback(() => {
    try {
      const savedData = localStorage.getItem(PDF_DATA_LOCAL_STORAGE_KEY);

      if (savedData) {
        const json: unknown = JSON.parse(savedData);
        const parsedData = invoiceSchema.parse(json);

        return parsedData;
      }

      return null;
    } catch (error) {
      console.error("Error loading from localStorage:", error);
      toast.error("Failed to load saved invoice data");
      return null;
    }
  }, []);

  // Initialize invoice data
  useEffect(() => {
    const urlData = searchParams.get("data");

    if (urlData) {
      // Load from URL
      try {
        const decompressed = decompressFromEncodedURIComponent(urlData);
        if (!decompressed) {
          throw new Error("Failed to decompress URL data");
        }

        const json: unknown = JSON.parse(decompressed);
        const restored = decompressInvoiceData(json as Record<string, unknown>);
        const parsedData = invoiceSchema.parse(restored);

        setInvoiceDataState(parsedData);

        // Save to localStorage for future use
        if (isLocalStorageAvailable()) {
          localStorage.setItem(
            PDF_DATA_LOCAL_STORAGE_KEY,
            JSON.stringify(parsedData),
          );
        }
      } catch (error) {
        console.error("Error loading from URL:", error);
        toast.error("Failed to load invoice from URL");

        // Fall back to localStorage or default
        const localData = loadFromLocalStorage();
        setInvoiceDataState(localData || INITIAL_INVOICE_DATA);
      }
    } else {
      // Load from localStorage or use default
      const localData = loadFromLocalStorage();

      if (localData) {
        setInvoiceDataState(localData);
      } else {
        // Use template from URL if valid, otherwise default
        const templateToUse = templateValidation.success
          ? templateValidation.data
          : "default";

        setInvoiceDataState({
          ...INITIAL_INVOICE_DATA,
          template: templateToUse,
        });
      }
    }
  }, [searchParams, templateValidation, loadFromLocalStorage]);

  // Handle invoice data changes
  const handleInvoiceDataChange = useCallback((updatedData: InvoiceData) => {
    // Use functional update to access current state and prevent unnecessary updates
    setInvoiceDataState((currentData) => {
      // Deep comparison using JSON.stringify to check if data actually changed
      // This prevents unnecessary re-renders when the data values are the same
      if (
        currentData &&
        JSON.stringify(currentData) === JSON.stringify(updatedData)
      ) {
        return currentData; // Return same reference to prevent re-render
      }
      return updatedData;
    });

    // Save to localStorage
    if (isLocalStorageAvailable()) {
      try {
        localStorage.setItem(
          PDF_DATA_LOCAL_STORAGE_KEY,
          JSON.stringify(updatedData),
        );
      } catch (error) {
        console.error("Error saving to localStorage:", error);
      }
    }
  }, []);

  // Handle share invoice
  const handleShareInvoice = useCallback(() => {
    if (!invoiceDataState) return;

    try {
      const compressed = compressInvoiceData(invoiceDataState);
      const jsonString = JSON.stringify(compressed);
      const encoded = compressToEncodedURIComponent(jsonString);

      const url = `${window.location.origin}/invoice?data=${encoded}`;

      navigator.clipboard.writeText(url);
      toast.success("Invoice link copied to clipboard!");
    } catch (error) {
      console.error("Error sharing invoice:", error);
      toast.error("Failed to create shareable link");
    }
  }, [invoiceDataState]);

  if (!invoiceDataState) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-gray-600">Loading invoice generator...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Invoice Generator</h1>
            <p className="text-gray-600">
              Create professional invoices with live PDF preview
            </p>
          </div>
          <div>
            <Link
              href="/"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4 flex gap-2">
          <div className="mb-4 flex gap-2">
            <InvoicePDFDownloadLink
              invoiceData={invoiceDataState}
              errorWhileGeneratingPdfIsShown={errorWhileGeneratingPdfIsShown}
              setErrorWhileGeneratingPdfIsShown={
                setErrorWhileGeneratingPdfIsShown
              }
            />
            <Button
              onClick={handleShareInvoice}
              disabled={!canShareInvoice}
              variant="outline"
              title={
                canShareInvoice
                  ? "Copy shareable link to clipboard"
                  : "Fix validation errors before sharing"
              }
            >
              Share Invoice
            </Button>
          </div>

          <InvoiceClientPage
            invoiceDataState={invoiceDataState}
            handleInvoiceDataChange={handleInvoiceDataChange}
            handleShareInvoice={handleShareInvoice}
            isMobile={isMobile}
            errorWhileGeneratingPdfIsShown={errorWhileGeneratingPdfIsShown}
            setErrorWhileGeneratingPdfIsShown={
              setErrorWhileGeneratingPdfIsShown
            }
            setCanShareInvoice={setCanShareInvoice}
            canShareInvoice={canShareInvoice}
          />

          <Dialog
            open={errorWhileGeneratingPdfIsShown}
            onOpenChange={setErrorWhileGeneratingPdfIsShown}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircleIcon className="h-5 w-5 text-red-500" />
                  PDF Generation Error
                </DialogTitle>
                <DialogDescription>
                  There was an error generating the PDF preview. Please check
                  your invoice data and try again.
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
