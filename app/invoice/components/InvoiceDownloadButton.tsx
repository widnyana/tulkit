"use client";

import type { InvoiceData } from "@/lib/invoice/types";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Download } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DefaultTemplate } from "../templates/default/DefaultTemplate";
import { StripeTemplate } from "../templates/stripe/StripeTemplate";
import { GraniteTemplate } from "../templates/granite-ledger/GraniteTemplate";
import { ApexTemplate } from "../templates/apex/ApexTemplate";
import { Button } from "./ui/button";

interface InvoiceDownloadButtonProps {
  invoiceData: InvoiceData;
}

const InvoiceDownloadButton: React.FC<InvoiceDownloadButtonProps> = ({
  invoiceData,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Check if we have valid data to generate
  const hasValidData = invoiceData.sender.name && invoiceData.recipient.name;

  const handleDownloadStart = () => {
    setIsGenerating(true);
    toast.info("Preparing your PDF...");
  };

  const handleDownloadError = () => {
    setIsGenerating(false);
    toast.error("Failed to generate PDF. Please try again.");
  };

  // Generate a key based on critical fields to force remount on changes
  // This prevents React reconciliation bugs in @react-pdf/renderer
  const dataKey = useMemo(() => {
    const parts = [
      invoiceData.templateKey || "default",
      invoiceData.invoiceNumber,
      invoiceData.issueDate,
      invoiceData.dueDate,
      invoiceData.logo ? "has-logo" : "no-logo",
      invoiceData.paymentInfo?.paymentQRCode ? "has-qr" : "no-qr",
      invoiceData.notes || "no-notes",
      invoiceData.items.length,
      invoiceData.taxEnabled ? "tax-on" : "tax-off",
      invoiceData.taxRate,
      invoiceData.currency,
      invoiceData.sender.name,
      invoiceData.recipient.name,
    ];
    return parts.join("-");
  }, [
    invoiceData.templateKey,
    invoiceData.invoiceNumber,
    invoiceData.issueDate,
    invoiceData.dueDate,
    invoiceData.logo,
    invoiceData.paymentInfo?.paymentQRCode,
    invoiceData.notes,
    invoiceData.items.length,
    invoiceData.taxEnabled,
    invoiceData.taxRate,
    invoiceData.currency,
    invoiceData.sender.name,
    invoiceData.recipient.name,
  ]);

  if (!hasValidData) {
    return (
      <Button variant="outline" disabled className="w-full">
        <Download className="w-4 h-4 mr-2" />
        Fill Form to Download
      </Button>
    );
  }

  return (
    <div className="p-4 border-t bg-gray-50">
      <PDFDownloadLink
        key={dataKey}
        document={
          invoiceData.templateKey === "stripe" ? (
            <StripeTemplate invoiceData={invoiceData} />
          ) : invoiceData.templateKey === "granite" ? (
            <GraniteTemplate invoiceData={invoiceData} />
          ) : invoiceData.templateKey === "apex" ? (
            <ApexTemplate invoiceData={invoiceData} />
          ) : (
            <DefaultTemplate invoiceData={invoiceData} />
          )
        }
        fileName={`invoice-${invoiceData.invoiceNumber || "untitled"}.pdf`}
        className="w-full block"
        onClick={handleDownloadStart}
        onError={handleDownloadError}
      >
        {({ loading }) => (
          <Button
            disabled={loading || isGenerating}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-6 text-base shadow-sm transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5 mr-2" />
            {loading || isGenerating
              ? "Generating PDF..."
              : "Download Invoice PDF"}
          </Button>
        )}
      </PDFDownloadLink>
    </div>
  );
};

export default InvoiceDownloadButton;
