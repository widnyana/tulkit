"use client";

import type { InvoiceData } from "@/lib/invoice/types";
import type React from "react";
import { useEffect, useState } from "react";
import InvoicePDFViewer from "./invoice-pdf-viewer/InvoicePDFViewer";

interface InvoicePDFPreviewProps {
  invoiceData: InvoiceData;
}

const InvoicePDFPreview: React.FC<InvoicePDFPreviewProps> = ({
  invoiceData,
}) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Enhanced validation to prevent "Eo is not a function" errors
  const hasValidData =
    // required sender fields
    invoiceData.sender?.name?.trim() &&
    invoiceData.sender?.address?.trim() &&
    invoiceData.sender?.email?.trim() &&
    // required recipient fields
    invoiceData.recipient?.name?.trim() &&
    invoiceData.recipient?.address?.trim() &&
    // invoice details
    invoiceData.invoiceNumber?.trim() &&
    invoiceData.issueDate?.trim() &&
    invoiceData.dueDate?.trim() &&
    // Ensure items array exists and has at least one item
    Array.isArray(invoiceData.items) &&
    invoiceData.items.length > 0;

  if (!isClient) {
    // Render placeholder during SSR/hydration
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">Loading preview...</p>
      </div>
    );
  }

  if (!hasValidData) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        <p className="text-gray-500 text-center p-4">
          Fill in the invoice details to see the preview
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <InvoicePDFViewer invoiceData={invoiceData} />
    </div>
  );
};

export default InvoicePDFPreview;
