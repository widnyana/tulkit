import { ErrorGeneratingPdfToast } from "@/app/invoice/components/ui/toasts/error-generating-pdf-toast";
import {
  type InvoiceData,
  LANGUAGE_TO_LABEL,
  type SupportedLanguages,
} from "@/app/invoice/schema";
import { cn } from "@/lib/utils";
import { usePDF } from "@react-pdf/renderer/lib/react-pdf.browser";
import dayjs from "dayjs";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { LOADING_BUTTON_TEXT, LOADING_BUTTON_TIMEOUT } from "./form-complete";
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

  return `Download PDF in ${languageLabel}`;
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
  const [{ loading: pdfLoading, url, error }, updatePdfInstance] = usePDF();
  const [isLoading, setIsLoading] = useState(false);

  const handleDownloadPDFClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!url) {
        e.preventDefault();
        toast.error(
          "File not available. Please try again in different browser.",
        );
        return;
      }

      if (!isLoading && !error) {
        // close all other toasts (if any)
        toast.dismiss();
      }
    },
    [url, isLoading, error],
  );

  // Memoize static values
  const filename = useMemo(() => {
    const invoiceNumberValue = invoiceData?.invoiceNumberObject?.value;

    // Replace all slashes with dashes (e.g. 01/2025 -> 01-2025)
    const formattedInvoiceNumber = invoiceNumberValue
      ? invoiceNumberValue?.replace(/\//g, "-")
      : dayjs().format("MM-YYYY"); // Fallback to current month and year if no invoice number

    const name = `invoice-${invoiceData?.language?.toUpperCase()}-${formattedInvoiceNumber}.pdf`;

    return name;
  }, [invoiceData?.language, invoiceData?.invoiceNumberObject]);

  const PdfDocument = useMemo(() => {
    switch (invoiceData.template) {
      case "stripe":
        return <StripeInvoicePdfTemplate invoiceData={invoiceData} />;
      case "default":
      default:
        return <InvoicePdfTemplate invoiceData={invoiceData} />;
    }
  }, [invoiceData]);

  // Handle PDF updates
  useEffect(() => {
    updatePdfInstance(PdfDocument);
  }, [PdfDocument, updatePdfInstance]);

  // Handle loading state (for better UX)
  useEffect(() => {
    if (!pdfLoading) {
      const timer = setTimeout(
        () => setIsLoading(false),
        LOADING_BUTTON_TIMEOUT,
      );
      return () => clearTimeout(timer);
    }
    setIsLoading(true);
  }, [pdfLoading]);

  // Handle errors
  useEffect(() => {
    if (error && !errorWhileGeneratingPdfIsShown) {
      ErrorGeneratingPdfToast();
      setErrorWhileGeneratingPdfIsShown(true);
    }
  }, [
    error,
    errorWhileGeneratingPdfIsShown,
    setErrorWhileGeneratingPdfIsShown,
  ]);

  return (
    <a
      translate="no"
      href={url || "#"}
      download={url ? filename : undefined}
      onClick={handleDownloadPDFClick}
      className={cn(
        "h-[36px] w-full rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-medium text-slate-50",
        "shadow-sm shadow-black/5 outline-offset-2 hover:bg-slate-900/90 active:scale-[98%] active:transition-transform",
        "focus-visible:border-indigo-500 focus-visible:ring focus-visible:ring-indigo-200 focus-visible:ring-opacity-50",
        "dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50/90 lg:mb-0 lg:w-[210px]",
        {
          "pointer-events-none opacity-70": isLoading,
          "lg:w-[240px]": invoiceData.language === "pt",
        },
      )}
    >
      <ButtonContent isLoading={isLoading} language={invoiceData.language} />
    </a>
  );
}
