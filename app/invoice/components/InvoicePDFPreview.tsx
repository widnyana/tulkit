"use client";

import type { InvoiceData } from "@/lib/invoice/types";
import dynamic from "next/dynamic";
import type React from "react";

const InvoicePDFViewer = dynamic(
  () => import("./invoice-pdf-viewer/InvoicePDFViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-muted">
        <p className="text-muted-foreground">Loading preview...</p>
      </div>
    ),
  },
);

interface InvoicePDFPreviewProps {
  invoiceData: InvoiceData;
}

const InvoicePDFPreview: React.FC<InvoicePDFPreviewProps> = ({
  invoiceData,
}) => {
  const hasValidData = Boolean(
    invoiceData.sender?.name?.trim() &&
      invoiceData.sender?.address?.trim() &&
      invoiceData.recipient?.name?.trim() &&
      invoiceData.recipient?.address?.trim() &&
      invoiceData.invoiceNumber?.trim() &&
      invoiceData.issueDate?.trim() &&
      invoiceData.dueDate?.trim() &&
      Array.isArray(invoiceData.items) &&
      invoiceData.items.length > 0,
  );

  if (!hasValidData) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted">
        <p className="text-muted-foreground text-center p-4">
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
