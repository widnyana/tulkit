"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { Download } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { TEMPLATE_REGISTRY as templates } from "../templates";
import { Button } from "./ui/button";
import { InvoiceData } from "@/lib/types";

interface InvoiceDownloadButtonProps {
  invoiceData: InvoiceData;
}

const InvoiceDownloadButton: React.FC<InvoiceDownloadButtonProps> = ({
  invoiceData,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Memoize the selected template component
  const SelectedTemplate =
    templates[invoiceData.templateKey as keyof typeof templates]?.component ||
    templates.default.component;

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
    <div className="p-4">
      <PDFDownloadLink
        document={<SelectedTemplate invoiceData={invoiceData} />}
        fileName={`invoice-${invoiceData.invoiceNumber || "untitled"}.pdf`}
        className="w-full"
        onClick={handleDownloadStart}
        onError={handleDownloadError}
      >
        {({ loading }) => (
          <Button disabled={loading || isGenerating} className="w-full">
            <Download className="w-4 h-4 mr-2" />
            {loading || isGenerating ? "Generating..." : "Download PDF"}
          </Button>
        )}
      </PDFDownloadLink>
    </div>
  );
};

export default InvoiceDownloadButton;
