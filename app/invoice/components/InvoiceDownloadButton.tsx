"use client";

import type { InvoiceData } from "@/lib/invoice/types";
import { saveAs } from "file-saver";
import { Download } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";

interface InvoiceDownloadButtonProps {
  invoiceData: InvoiceData;
}

const InvoiceDownloadButton: React.FC<InvoiceDownloadButtonProps> = ({
  invoiceData,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const hasValidData = Boolean(
    invoiceData.sender.name && invoiceData.recipient.name,
  );

  const handleDownload = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    toast.info("Preparing your PDF...");

    try {
      // The renderer and the template tree load on click, not on page open.
      const [{ pdf }, { InvoiceDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("../invoice-document"),
      ]);
      const blob = await pdf(
        <InvoiceDocument invoiceData={invoiceData} />,
      ).toBlob();
      saveAs(blob, `invoice-${invoiceData.invoiceNumber || "untitled"}.pdf`);
    } catch {
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
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
    <div className="p-4 border-t bg-muted">
      <Button
        onClick={handleDownload}
        disabled={isGenerating}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-6 text-base shadow-sm transition-all hover:shadow-md disabled:hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-5 h-5 mr-2" />
        {isGenerating ? "Generating PDF..." : "Download Invoice PDF"}
      </Button>
    </div>
  );
};

export default InvoiceDownloadButton;
