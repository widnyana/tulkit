"use client";

import type { InvoiceData } from "@/lib/invoice/types";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Download } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { DefaultTemplate } from "../templates/default/DefaultTemplate";
import { StripeTemplate } from "../templates/stripe/StripeTemplate";
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
        key={invoiceData.templateKey || "default"}
        document={
          invoiceData.templateKey === "stripe" ? (
            <StripeTemplate invoiceData={invoiceData} />
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
