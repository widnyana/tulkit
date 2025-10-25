import { usePDF } from "@react-pdf/renderer";
import { Download, Loader2 } from "lucide-react";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo } from "react";

import { cn } from "@/lib/utils";

import {
  type InvoiceData,
  LANGUAGE_TO_LABEL,
  type SupportedLanguages,
} from "@/app/invoice/schema";
import { LOADING_BUTTON_TEXT } from "./form-complete";
import { StripeInvoicePdfTemplate } from "./invoice-pdf-stripe-template";
import { InvoicePdfTemplate } from "./invoice-pdf-template";

// Separate button states into a memoized component
const ButtonContent = ({
  isLoading,
  language,
}: {
  isLoading: boolean;
  language: SupportedLanguages;
}) => {
  if (isLoading) {
    return (
      <span className="inline-flex items-center">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        <span className="animate-pulse">{LOADING_BUTTON_TEXT}</span>
      </span>
    );
  }

  const languageLabel = LANGUAGE_TO_LABEL[language];

  return (
    <span className="inline-flex items-center">
      <Download className="mr-2 h-4 w-4" />
      {`Download PDF in ${languageLabel}`}
    </span>
  );
};

export function InvoicePDFDownloadLink({
  invoiceData,
  errorWhileGeneratingPdfIsShown,
  setErrorWhileGeneratingPdfIsShown,
}: {
  invoiceData: InvoiceData;
  errorWhileGeneratingPdfIsShown: boolean;
  setErrorWhileGeneratingPdfIsShown: (error: boolean) => void;
}) {
  // Filename that only changes when language or invoice number changes
  const filename = useMemo(() => {
    const invoiceNumberValue = invoiceData?.invoiceNumberObject?.value;
    const formattedInvoiceNumber = invoiceNumberValue
      ? invoiceNumberValue?.replace(/\//g, "-")
      : dayjs().format("MM-YYYY");
    return `invoice-${invoiceData?.language?.toUpperCase()}-${formattedInvoiceNumber}.pdf`;
  }, [invoiceData?.language, invoiceData?.invoiceNumberObject?.value]);

  // Create the document based on template
  const document = useMemo(() => {
    return invoiceData.template === "stripe" ? (
      <StripeInvoicePdfTemplate invoiceData={invoiceData} />
    ) : (
      <InvoicePdfTemplate invoiceData={invoiceData} />
    );
  }, [invoiceData.template, invoiceData]); // Include invoiceData to ensure updates, but template is primary trigger

  // Use usePDF hook to generate the PDF
  const [instance, updateInstance] = usePDF({ document });

  // Update PDF when document changes
  useEffect(() => {
    updateInstance(document);
  }, [document, updateInstance]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (instance.url && typeof window !== "undefined") {
      const link = window.document.createElement("a");
      link.href = instance.url;
      link.download = filename;
      link.click();
    }
  }, [instance.url, filename]);

  // Handle errors
  useEffect(() => {
    if (instance.error && !errorWhileGeneratingPdfIsShown) {
      setErrorWhileGeneratingPdfIsShown(true);
    }
  }, [
    instance.error,
    errorWhileGeneratingPdfIsShown,
    setErrorWhileGeneratingPdfIsShown,
  ]);

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={instance.loading}
      className={cn(
        "h-[36px] rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-medium text-slate-50 min-w-[210px]",
        "shadow-sm shadow-black/5 outline-offset-2 hover:bg-slate-900/90 active:scale-[98%] active:transition-transform",
        "focus-visible:border-indigo-500 focus-visible:ring focus-visible:ring-indigo-200 focus-visible:ring-opacity-50",
        "dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50/90",
        instance.loading && "opacity-75 cursor-not-allowed",
      )}
    >
      <ButtonContent
        isLoading={instance.loading}
        language={invoiceData.language}
      />
    </button>
  );
}
