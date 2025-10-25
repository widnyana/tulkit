import {
  type InvoiceData,
  LANGUAGE_TO_LABEL,
  type SupportedLanguages,
} from "@/app/invoice/schema";
import { cn } from "@/lib/utils";
import { PDFDownloadLink } from "@react-pdf/renderer";
import dayjs from "dayjs";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
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
  // Memoize filename to prevent recalculation
  const filename = useMemo(() => {
    const invoiceNumberValue = invoiceData?.invoiceNumberObject?.value;

    // Replace all slashes with dashes (e.g. 01/2025 -> 01-2025)
    const formattedInvoiceNumber = invoiceNumberValue
      ? invoiceNumberValue?.replace(/\//g, "-")
      : dayjs().format("MM-YYYY"); // Fallback to current month and year if no invoice number

    const name = `invoice-${invoiceData?.language?.toUpperCase()}-${formattedInvoiceNumber}.pdf`;

    return name;
  }, [invoiceData?.language, invoiceData?.invoiceNumberObject]);

  // Create a memoized PDF document component that only re-renders when the template changes
  const MemoizedDocumentComponent = useMemo(() => {
    return function MemoizedDocument() {
      switch (invoiceData.template) {
        case "stripe":
          return <StripeInvoicePdfTemplate invoiceData={invoiceData} />;
        default:
          return <InvoicePdfTemplate invoiceData={invoiceData} />;
      }
    };
  }, [invoiceData.template]); // Only re-create when template changes

  return (
    <PDFDownloadLink
      document={<MemoizedDocumentComponent />}
      fileName={filename}
      className={cn(
        "h-[36px] w-full rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-medium text-slate-50",
        "shadow-sm shadow-black/5 outline-offset-2 hover:bg-slate-900/90 active:scale-[98%] active:transition-transform",
        "focus-visible:border-indigo-500 focus-visible:ring focus-visible:ring-indigo-200 focus-visible:ring-opacity-50",
        "dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50/90 lg:mb-0 lg:w-[210px]",
      )}
    >
      {({ loading, error }) => {
        // Show error state
        if (error && !errorWhileGeneratingPdfIsShown) {
          setErrorWhileGeneratingPdfIsShown(true);
        }

        // Return button content based on loading state
        return (
          <ButtonContent isLoading={loading} language={invoiceData.language} />
        );
      }}
    </PDFDownloadLink>
  );
}
