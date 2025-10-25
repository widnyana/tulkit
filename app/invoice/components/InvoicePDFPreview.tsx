"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PDFViewer } from "@react-pdf/renderer";
import { InvoiceData } from "../../../../lib/invoice/types";
import { TEMPLATE_REGISTRY as templates } from "../templates";

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

  // Memoize the selected template component
  const SelectedTemplate = useMemo(() => {
    const templateKey = invoiceData.templateKey as keyof typeof templates;
    return templates[templateKey]?.component || templates.default.component;
  }, [invoiceData.templateKey]);

  // Check if we have valid data to render
  const hasValidData = invoiceData.sender.name && invoiceData.recipient.name;

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
      <PDFViewer width="100%" height="100%" style={{ border: "none" }}>
        <SelectedTemplate invoiceData={invoiceData} />
      </PDFViewer>
    </div>
  );
};

export default InvoicePDFPreview;
