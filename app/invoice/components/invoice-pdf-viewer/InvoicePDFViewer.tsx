"use client";

import type { InvoiceData } from "@/lib/invoice/types";
import { PDFViewer } from "@react-pdf/renderer";
import type React from "react";
import { useMemo } from "react";
import { ApexTemplate } from "../../templates/apex/ApexTemplate";
import { DefaultTemplate } from "../../templates/default/DefaultTemplate";
import { GraniteTemplate } from "../../templates/granite-ledger/GraniteTemplate";
import { StripeTemplate } from "../../templates/stripe/StripeTemplate";

interface InvoicePDFViewerProps {
  invoiceData: InvoiceData;
}

const InvoicePDFViewer: React.FC<InvoicePDFViewerProps> = ({ invoiceData }) => {
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

  return (
    <PDFViewer
      key={dataKey}
      width="100%"
      height="100%"
      style={{ border: "none" }}
    >
      {invoiceData.templateKey === "stripe" ? (
        <StripeTemplate invoiceData={invoiceData} />
      ) : invoiceData.templateKey === "granite" ? (
        <GraniteTemplate invoiceData={invoiceData} />
      ) : invoiceData.templateKey === "apex" ? (
        <ApexTemplate invoiceData={invoiceData} />
      ) : (
        <DefaultTemplate invoiceData={invoiceData} />
      )}
    </PDFViewer>
  );
};

export default InvoicePDFViewer;
