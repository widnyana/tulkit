import { Button } from "@/app/invoice/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/invoice/components/ui/tabs";
import { CustomTooltip } from "@/app/invoice/components/ui/tooltip";
import type { InvoiceData } from "@/app/invoice/schema";
import { cn } from "@/lib/cn";
import { AlertCircleIcon, FileTextIcon, PencilIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { InvoiceForm } from "./form-complete";
import { InvoicePDFDownloadLink } from "./invoice-pdf-download-link";
import { InvoicePdfTemplate } from "./pdf/default-template-complete";
import { StripeInvoicePdfTemplate } from "./pdf/stripe-template-complete";

const DesktopPDFViewerModuleLoading = () => (
  <div className="flex h-[580px] w-full items-center justify-center border border-gray-200 bg-gray-200 lg:h-[620px] 2xl:h-[700px]">
    <div className="text-center">
      <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      <p className="text-gray-600">Loading PDF viewer...</p>
    </div>
  </div>
);

const MobileInvoicePDFViewerModuleLoading = () => (
  <div className="flex h-[480px] w-[650px] items-center justify-center border border-gray-200 bg-gray-200 lg:h-[620px] 2xl:h-[700px]">
    <div className="text-center">
      <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      <p className="text-gray-600">Loading PDF viewer...</p>
    </div>
  </div>
);

const DesktopInvoicePDFViewer = dynamic(
  () =>
    import("./invoice-pdf-preview/desktop-pdf-viewer").then(
      (mod) => mod.DesktopInvoicePDFViewer,
    ),

  {
    ssr: false,
    loading: () => <DesktopPDFViewerModuleLoading />,
  },
);

const MobileInvoicePDFViewer = dynamic(
  () =>
    import("./invoice-pdf-preview/mobile-pdf-viewer").then(
      (mod) => mod.MobileInvoicePDFViewer,
    ),
  {
    ssr: false,
    loading: () => <MobileInvoicePDFViewerModuleLoading />,
  },
);

const PdfViewer = ({
  invoiceData,
  errorWhileGeneratingPdfIsShown,
  isMobile,
}: {
  invoiceData: InvoiceData;
  errorWhileGeneratingPdfIsShown: boolean;
  isMobile: boolean;
}) => {
  // Render the appropriate template based on the selected template
  const renderTemplate = () => {
    switch (invoiceData.template) {
      case "stripe":
        return <StripeInvoicePdfTemplate invoiceData={invoiceData} />;
      default:
        return <InvoicePdfTemplate invoiceData={invoiceData} />;
    }
  };

  // Use Mobile PDF viewer for:
  // 1. Mobile devices
  // 2. Any in-app browser/WebView environment (new logic for platforms like X.com, LinkedIn, etc.)
  // This is due to limitations of the standard PDF viewer in these environments
  // https://github.com/diegomura/react-pdf/issues/714
  if (isMobile) {
    return <MobileInvoicePDFViewer invoiceData={invoiceData} />;
  }

  const template = renderTemplate();

  // Normal version for standard desktop browsers
  return (
    <DesktopInvoicePDFViewer
      errorWhileGeneratingPdfIsShown={errorWhileGeneratingPdfIsShown}
    >
      {template}
    </DesktopInvoicePDFViewer>
  );
};

const TABS_VALUES = ["invoice-form", "invoice-preview"] as const;

const TAB_INVOICE_FORM = TABS_VALUES[0];
const TAB_INVOICE_PREVIEW = TABS_VALUES[1];

export function InvoiceClientPage({
  invoiceDataState,
  handleInvoiceDataChange,
  handleShareInvoice,
  isMobile,
  errorWhileGeneratingPdfIsShown,
  setErrorWhileGeneratingPdfIsShown,
  setCanShareInvoice,
  canShareInvoice,
}: {
  invoiceDataState: InvoiceData;
  handleInvoiceDataChange: (invoiceData: InvoiceData) => void;
  handleShareInvoice: () => void;
  isMobile: boolean;
  errorWhileGeneratingPdfIsShown: boolean;
  setErrorWhileGeneratingPdfIsShown: (error: boolean) => void;
  setCanShareInvoice: (canShareInvoice: boolean) => void;
  canShareInvoice: boolean;
}) {
  return (
    <>
      {isMobile ? (
        <div>
          <Tabs defaultValue={TAB_INVOICE_FORM} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value={TAB_INVOICE_FORM} className="flex-1">
                <span className="flex items-center gap-1">
                  <PencilIcon className="h-4 w-4" />
                  Edit Invoice
                </span>
              </TabsTrigger>
              <TabsTrigger value={TAB_INVOICE_PREVIEW} className="flex-1">
                <span className="flex items-center gap-1">
                  <FileTextIcon className="h-4 w-4" />
                  Preview PDF
                </span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value={TAB_INVOICE_FORM} className="mt-1">
              <div className="h-[480px] overflow-auto rounded-lg border-b px-3 shadow-sm">
                <InvoiceForm
                  invoiceData={invoiceDataState}
                  handleInvoiceDataChange={handleInvoiceDataChange}
                  setCanShareInvoice={setCanShareInvoice}
                />
              </div>
            </TabsContent>
            <TabsContent value={TAB_INVOICE_PREVIEW} className="mt-1">
              <div className="flex h-[480px] w-full items-center justify-center">
                <PdfViewer
                  invoiceData={invoiceDataState}
                  errorWhileGeneratingPdfIsShown={
                    errorWhileGeneratingPdfIsShown
                  }
                  isMobile={isMobile}
                />
              </div>
            </TabsContent>
          </Tabs>
          <div className="sticky bottom-0 z-50 mt-2 flex flex-col items-center justify-center gap-3 rounded-lg border border-t border-gray-200 bg-white px-3 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1),0_-2px_4px_-2px_rgba(0,0,0,0.05)]">
            <CustomTooltip
              className={cn(!canShareInvoice && "bg-red-50")}
              trigger={
                <Button
                  data-disabled={!canShareInvoice} // for better UX than 'disabled'
                  onClick={handleShareInvoice}
                  _variant="outline"
                  className={cn("mx-2 w-full")}
                >
                  Generate a link to invoice
                </Button>
              }
              content={
                canShareInvoice ? (
                  <div className="flex items-center gap-3 p-2">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">
                        Share Invoice Online
                      </p>
                      <p className="text-pretty text-xs leading-relaxed text-slate-700">
                        Generate a secure link to share this invoice with your
                        clients. They can view and download it directly from
                        their browser.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    data-testid="share-invoice-tooltip-content"
                    className="flex items-center gap-3 bg-red-50 p-3"
                  >
                    <AlertCircleIcon className="h-5 w-5 flex-shrink-0 fill-red-600 text-white" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-red-800">
                        Unable to Share Invoice
                      </p>
                      <p className="text-pretty text-xs leading-relaxed text-red-700">
                        Invoices with logos cannot be shared. Please remove the
                        logo to generate a shareable link. You can still
                        download the invoice as PDF and share it.
                      </p>
                    </div>
                  </div>
                )
              }
            />
            <InvoicePDFDownloadLink
              invoiceData={invoiceDataState}
              errorWhileGeneratingPdfIsShown={errorWhileGeneratingPdfIsShown}
              setErrorWhileGeneratingPdfIsShown={
                setErrorWhileGeneratingPdfIsShown
              }
            />
          </div>
        </div>
      ) : (
        // Desktop View - side by side layout
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-5">
            <div className="h-[620px] overflow-auto border border-gray-200 rounded-lg px-3 pl-0 2xl:h-[700px]">
              <InvoiceForm
                invoiceData={invoiceDataState}
                handleInvoiceDataChange={handleInvoiceDataChange}
                setCanShareInvoice={setCanShareInvoice}
              />
            </div>
          </div>
          <div className="col-span-7 h-[620px] w-full max-w-full 2xl:h-[700px]">
            <div className="h-full border border-gray-200 rounded-lg overflow-hidden">
              <PdfViewer
                invoiceData={invoiceDataState}
                errorWhileGeneratingPdfIsShown={errorWhileGeneratingPdfIsShown}
                isMobile={false}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
