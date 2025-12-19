"use client";

import { loadInvoice } from "@/lib/invoice/storage";
import type { InvoiceData } from "@/lib/invoice/types";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import InvoiceDownloadButton from "./components/InvoiceDownloadButton";
import InvoiceForm from "./components/InvoiceForm";
import InvoicePDFPreview from "./components/InvoicePDFPreview";
import Link from "next/link";

const defaultInvoiceData: InvoiceData = {
  sender: {
    name: "",
    address: "",
    email: "",
    phone: "",
  },
  recipient: {
    name: "",
    address: "",
  },
  invoiceNumber: "INV-001",
  issueDate: new Date().toISOString().split("T")[0],
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0], // 7 days from now
  items: [
    {
      id: "1",
      description: "Initial item",
      quantity: 1,
      unitPrice: 0,
      notes: "",
    },
  ],
  notes: "",
  taxEnabled: false,
  taxRate: 10,
  templateKey: "default",
  currency: "$",
  decimalSeparator: ",",
  thousandSeparator: ".",
  paymentInfo: {
    bankName: "",
    accountNumber: "",
    routingCode: "",
    paymentMethods: [],
    paymentQRCode: "",
  },
};

const InvoicePage = () => {
  const [invoiceData, setInvoiceData] =
    useState<InvoiceData>(defaultInvoiceData);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load saved data from localStorage when component mounts
    const savedData = loadInvoice();
    if (savedData) {
      setInvoiceData(savedData);
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-label="Back arrow"
          >
            <title>Back to Home</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Home
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
          Invoice Generator
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-150px)]">
          <div className="bg-white rounded-lg shadow-md overflow-y-auto">
            <InvoiceForm
              initialData={invoiceData}
              onDataChange={setInvoiceData}
            />
          </div>

          <div className="flex flex-col bg-white rounded-lg shadow-md">
            <div className="flex-grow h-[calc(100%-80px)]">
              <InvoicePDFPreview invoiceData={invoiceData} />
            </div>
            <InvoiceDownloadButton invoiceData={invoiceData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePage;
