"use client";

import { saveInvoice } from "@/lib/invoice/storage";
import type { InvoiceData } from "@/lib/invoice/types";
import { invoiceDataSchema } from "@/lib/invoice/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Upload, X } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

interface InvoiceFormProps {
  initialData: InvoiceData;
  onDataChange: (data: InvoiceData) => void;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({
  initialData,
  onDataChange,
}) => {
  const [logoPreview, setLogoPreview] = useState<string | null>(
    initialData.logo || null,
  );

  const form = useForm<InvoiceData>({
    resolver: zodResolver(invoiceDataSchema),
    defaultValues: initialData,
  });

  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  // Watch form values to calculate totals
  const items = watch("items");
  const taxEnabled = watch("taxEnabled");
  const taxRate = watch("taxRate");

  // Calculate totals
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const taxAmount = taxEnabled ? subtotal * (taxRate / 100) : 0;
  const total = subtotal + taxAmount;

  // Effect to debounce saving to localStorage
  useEffect(() => {
    const subscription = watch((value) => {
      const timeoutId = setTimeout(() => {
        // Validate the current form data before saving
        const validated = invoiceDataSchema.safeParse(value);
        if (validated.success) {
          saveInvoice(validated.data);
          onDataChange(validated.data);
        } else {
          console.error("Invalid form data, not saving", validated.error);
        }
      }, 500); // 300ms debounce

      return () => clearTimeout(timeoutId);
    });

    return () => subscription.unsubscribe();
  }, [watch, onDataChange]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an image file
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Check file size (2MB)
    if (file.size > 2000 * 1024) {
      toast.error("Image size should be less than 2MB");
      return;
    }

    // Convert any image format to PNG for @react-pdf/renderer compatibility
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        // Create canvas to convert image
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          toast.error("Failed to process image");
          return;
        }

        // Set canvas size to image size (max 800x800 to keep file size reasonable)
        const maxSize = 800;
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to PNG base64
        const pngBase64 = canvas.toDataURL("image/png", 0.9);

        console.log("Logo converted to PNG, length:", pngBase64.length);
        setLogoPreview(pngBase64);
        setValue("logo", pngBase64);
        toast.success("Logo uploaded successfully");
      };

      img.onerror = () => {
        toast.error("Failed to load image. Please try a different file.");
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      toast.error("Failed to read file");
    };

    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setValue("logo", undefined);
    toast.success("Logo removed");
  };

  const addItem = () => {
    append({
      id: Date.now().toString(),
      description: "New item",
      quantity: 1,
      unitPrice: 0,
      notes: "",
    });
  };

  const removeItem = (index: number) => {
    remove(index);
  };

  return (
    <form className="space-y-6 p-4 text-gray-900">
      {/* Template and Currency Settings */}
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Template & Currency Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Template Selector */}
          <div className="space-y-2">
            <Controller
              name="templateKey"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-gray-700 text-sm font-medium text-gray-900 mb-1">
                    Template
                  </label>
                  <select
                    {...field}
                    className="w-full px-3 py-2 border text-gray-700  border-gray-300 rounded-md"
                    value={field.value}
                  >
                    <option value="default">Default Template</option>
                    <option value="apex">Apex</option>
                    <option value="granite">Granite Ledger</option>
                    <option value="stripe">Stripe</option>
                  </select>
                </div>
              )}
            />
          </div>

          {/* Currency Symbol */}
          <div className="space-y-2">
            <Controller
              name="currency"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-sm text-gray-700 font-medium mb-1">
                    Currency Symbol
                  </label>
                  <select
                    {...field}
                    className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-md"
                    value={field.value || "$"}
                  >
                    <option value="€">Euro - €</option>
                    <option value="$">US Dollar - $</option>
                    <option value="Rp">Indonesian Rupiah - Rp</option>
                    <option value="A$">Australian Dollar - A$</option>
                    <option value="R$">Brazilian Real - R$</option>
                    <option value="£">British Pound - £</option>
                    <option value="C$">Canadian Dollar - C$</option>
                    <option value="₹">Indian Rupee - ₹</option>
                    <option value="¥">Japanese Yen - ¥</option>
                    <option value="₽">Russian Ruble - ₽</option>
                    <option value="₩">South Korean Won - ₩</option>
                    <option value="kr">Swedish Krona - kr</option>
                    <option value="CHF">Swiss Franc - CHF</option>
                  </select>
                </div>
              )}
            />
          </div>

          {/* Decimal Separator */}
          <div className="space-y-2">
            <Controller
              name="decimalSeparator"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-sm font-medium text-gray-900 text-gray-700 mb-1">
                    Decimal Separator
                  </label>
                  <select
                    {...field}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={field.value || ","}
                  >
                    <option value=",">, (comma)</option>
                    <option value=".">. (period)</option>
                  </select>
                </div>
              )}
            />
          </div>

          {/* Thousand Separator */}
          <div className="space-y-2">
            <Controller
              name="thousandSeparator"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Thousand Separator
                  </label>
                  <select
                    {...field}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={field.value || "."}
                  >
                    <option value=".">. (period)</option>
                    <option value=",">, (comma)</option>
                    <option value=" "> (space)</option>
                    <option value="">None</option>
                  </select>
                </div>
              )}
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 text-gray-900 md:grid-cols-2 gap-6">
        {/* Sender Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">From</h3>
          <div className="space-y-2">
            <Controller
              name="sender.name"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Company Name
                  </label>
                  <input
                    {...field}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md ${errors.sender?.name ? "border-red-500" : "border-gray-300"}`}
                    placeholder="Your company name"
                  />
                  {errors.sender?.name && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.sender.name.message}
                    </p>
                  )}
                </div>
              )}
            />
            <Controller
              name="sender.address"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Address
                  </label>
                  <textarea
                    {...field}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-md ${errors.sender?.address ? "border-red-500" : "border-gray-300"}`}
                    placeholder="Your address"
                  />
                  {errors.sender?.address && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.sender.address.message}
                    </p>
                  )}
                </div>
              )}
            />
            <Controller
              name="sender.email"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Email
                  </label>
                  <input
                    {...field}
                    type="email"
                    className={`w-full px-3 py-2 border rounded-md ${errors.sender?.email ? "border-red-500" : "border-gray-300"}`}
                    placeholder="your@email.com"
                  />
                  {errors.sender?.email && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.sender.email.message}
                    </p>
                  )}
                </div>
              )}
            />
            <Controller
              name="sender.phone"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Phone
                  </label>
                  <input
                    {...field}
                    type="tel"
                    className={`w-full px-3 py-2 border rounded-md ${errors.sender?.phone ? "border-red-500" : "border-gray-300"}`}
                    placeholder="Your phone number"
                  />
                  {errors.sender?.phone && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.sender.phone.message}
                    </p>
                  )}
                </div>
              )}
            />
          </div>
        </div>

        {/* Recipient Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Bill To</h3>
          <div className="space-y-2">
            <Controller
              name="recipient.name"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Client Name
                  </label>
                  <input
                    {...field}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md ${errors.recipient?.name ? "border-red-500" : "border-gray-300"}`}
                    placeholder="Client name"
                  />
                  {errors.recipient?.name && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.recipient.name.message}
                    </p>
                  )}
                </div>
              )}
            />
            <Controller
              name="recipient.address"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Address
                  </label>
                  <textarea
                    {...field}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-md ${errors.recipient?.address ? "border-red-500" : "border-gray-300"}`}
                    placeholder="Client address"
                  />
                  {errors.recipient?.address && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.recipient.address.message}
                    </p>
                  )}
                </div>
              )}
            />
            <Controller
              name="recipient.email"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Email
                  </label>
                  <input
                    {...field}
                    type="email"
                    className={`w-full px-3 py-2 border rounded-md ${errors.recipient?.email ? "border-red-500" : "border-gray-300"}`}
                    placeholder="client@email.com"
                  />
                  {errors.recipient?.email && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.recipient.email.message}
                    </p>
                  )}
                </div>
              )}
            />
            <Controller
              name="recipient.phone"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Phone
                  </label>
                  <input
                    {...field}
                    type="tel"
                    className={`w-full px-3 py-2 border rounded-md ${errors.recipient?.phone ? "border-red-500" : "border-gray-300"}`}
                    placeholder="Client phone number"
                  />
                  {errors.recipient?.phone && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.recipient.phone.message}
                    </p>
                  )}
                </div>
              )}
            />
          </div>
        </div>
      </div>

      {/* Invoice Details & Logo */}
      <div className="border-b text-gray-900 border-gray-200 pb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Invoice Details & Logo
        </h3>

        {/* Invoice Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Controller
            name="invoiceNumber"
            control={control}
            render={({ field }) => (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Invoice Number
                </label>
                <input
                  {...field}
                  type="text"
                  className={`w-full px-3 py-2 border rounded-md ${errors.invoiceNumber ? "border-red-500" : "border-gray-300"}`}
                  placeholder="INV-001"
                />
                {errors.invoiceNumber && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.invoiceNumber.message}
                  </p>
                )}
              </div>
            )}
          />
          <Controller
            name="issueDate"
            control={control}
            render={({ field }) => (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Issue Date
                </label>
                <input
                  {...field}
                  type="date"
                  className={`w-full px-3 py-2 border rounded-md ${errors.issueDate ? "border-red-500" : "border-gray-300"}`}
                />
                {errors.issueDate && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.issueDate.message}
                  </p>
                )}
              </div>
            )}
          />
          <Controller
            name="dueDate"
            control={control}
            render={({ field }) => (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Due Date
                </label>
                <input
                  {...field}
                  type="date"
                  className={`w-full px-3 py-2 border rounded-md ${errors.dueDate ? "border-red-500" : "border-gray-300"}`}
                />
                {errors.dueDate && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.dueDate.message}
                  </p>
                )}
              </div>
            )}
          />
        </div>

        {/* Logo Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Company Logo (Optional)
          </label>
          <div className="flex items-center space-x-4">
            <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
              {logoPreview ? (
                <div className="relative w-full h-full rounded-md overflow-hidden">
                  <Image
                    src={logoPreview}
                    alt="Logo preview"
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 text-gray-400" />
                  <p className="text-sm text-gray-500 mt-2">Upload</p>
                </div>
              )}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleLogoChange}
              />
            </label>
            {logoPreview && (
              <button
                type="button"
                onClick={removeLogo}
                className="p-2 text-red-500 hover:bg-red-50 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">Items</h3>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Item
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fields.map((field, index) => (
                <React.Fragment key={field.id}>
                  <tr>
                    <td className="px-4 py-2">
                      <Controller
                        name={`items.${index}.description`}
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="text"
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                            placeholder="Item description"
                          />
                        )}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Controller
                        name={`items.${index}.quantity`}
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="number"
                            min="0"
                            step="1"
                            className="w-20 px-2 py-1 border border-gray-300 rounded"
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        )}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Controller
                        name={`items.${index}.unitPrice`}
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-24 px-2 py-1 border border-gray-300 rounded"
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        )}
                      />
                    </td>
                    <td className="px-4 py-2">
                      ${(field.quantity * field.unitPrice).toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-1 border-t-0" colSpan={5}>
                      <Controller
                        name={`items.${index}.notes`}
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="text"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            placeholder="Notes (optional)"
                          />
                        )}
                      />
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tax Settings */}
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Tax Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <Controller
              name="taxEnabled"
              control={control}
              render={({ field }) => (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={field.value}
                    className="h-4 w-4 text-blue-600 rounded"
                    onChange={(e) => field.onChange(e.target.checked)}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                  <label className="ml-2 text-sm font-medium text-gray-900 cursor-pointer">
                    Apply Tax
                  </label>
                </div>
              )}
            />
          </div>
          {taxEnabled && (
            <div>
              <Controller
                name="taxRate"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Tax Rate (%)
                    </label>
                    <input
                      {...field}
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className={`w-full px-3 py-2 border rounded-md ${errors.taxRate ? "border-red-500" : "border-gray-300"}`}
                      placeholder="Tax rate"
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                    {errors.taxRate && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.taxRate.message}
                      </p>
                    )}
                  </div>
                )}
              />
            </div>
          )}
        </div>
      </div>

      {/* Payment Information */}
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Payment Information (Optional)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Bank Name */}
          <div>
            <Controller
              name="paymentInfo.bankName"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Bank Name
                  </label>
                  <input
                    {...field}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Chase Bank"
                  />
                </div>
              )}
            />
          </div>

          {/* Account Number */}
          <div>
            <Controller
              name="paymentInfo.accountNumber"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Account Number
                  </label>
                  <input
                    {...field}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., 1234567890"
                  />
                </div>
              )}
            />
          </div>

          {/* Routing/SWIFT Code */}
          <div>
            <Controller
              name="paymentInfo.routingCode"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Routing/SWIFT Code
                  </label>
                  <input
                    {...field}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., CHASUS33"
                  />
                </div>
              )}
            />
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Accepted Payment Methods
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              "Bank Transfer",
              "Credit Card",
              "PayPal",
              "Wire Transfer",
              "Cash",
              "Check",
            ].map((method) => (
              <Controller
                key={method}
                name="paymentInfo.paymentMethods"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 rounded"
                      checked={field.value?.includes(method) || false}
                      onChange={(e) => {
                        const currentMethods = field.value || [];
                        if (e.target.checked) {
                          field.onChange([...currentMethods, method]);
                        } else {
                          field.onChange(
                            currentMethods.filter((m) => m !== method),
                          );
                        }
                      }}
                    />
                    <span className="text-sm">{method}</span>
                  </label>
                )}
              />
            ))}
          </div>
        </div>

        {/* Payment QR Code */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Payment QR Code (Optional)
          </label>
          <div className="flex items-center space-x-4">
            <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
              {watch("paymentInfo.paymentQRCode") ? (
                <div className="relative w-full h-full rounded-md overflow-hidden">
                  <Image
                    src={watch("paymentInfo.paymentQRCode") || ""}
                    alt="QR Code preview"
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 text-gray-400" />
                  <p className="text-sm text-gray-500 mt-2">Upload QR</p>
                </div>
              )}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  // Check if it's an image file
                  if (!file.type.startsWith("image/")) {
                    toast.error("Please upload an image file");
                    return;
                  }

                  // Check file size (1MB)
                  if (file.size > 1000 * 1024) {
                    toast.error("Image size should be less than 1MB");
                    return;
                  }

                  // Convert any image format to PNG for @react-pdf/renderer compatibility
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const img = new window.Image();
                    img.onload = () => {
                      // Create canvas to convert image
                      const canvas = document.createElement("canvas");
                      const ctx = canvas.getContext("2d");

                      if (!ctx) {
                        toast.error("Failed to process QR code");
                        return;
                      }

                      // Set canvas size (max 400x400 for QR codes)
                      const maxSize = 400;
                      let width = img.width;
                      let height = img.height;

                      if (width > maxSize || height > maxSize) {
                        if (width > height) {
                          height = (height / width) * maxSize;
                          width = maxSize;
                        } else {
                          width = (width / height) * maxSize;
                          height = maxSize;
                        }
                      }

                      canvas.width = width;
                      canvas.height = height;

                      // Draw image on canvas
                      ctx.drawImage(img, 0, 0, width, height);

                      // Convert to PNG base64
                      const pngBase64 = canvas.toDataURL("image/png", 0.9);

                      setValue("paymentInfo.paymentQRCode", pngBase64);
                      toast.success("QR code uploaded successfully");
                    };

                    img.onerror = () => {
                      toast.error(
                        "Failed to load QR code. Please try a different file.",
                      );
                    };

                    img.src = event.target?.result as string;
                  };

                  reader.onerror = () => {
                    toast.error("Failed to read file");
                  };

                  reader.readAsDataURL(file);
                }}
              />
            </label>
            {watch("paymentInfo.paymentQRCode") && (
              <button
                type="button"
                onClick={() => {
                  setValue("paymentInfo.paymentQRCode", undefined);
                  toast.success("QR code removed");
                }}
                className="p-2 text-red-500 hover:bg-red-50 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="bg-gray-50 p-4 rounded-md">
        <div className="flex justify-between mb-1">
          <span>Subtotal:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        {taxEnabled && (
          <div className="flex justify-between mb-1">
            <span>Tax ({taxRate}%):</span>
            <span>${taxAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-gray-200">
          <span>Total:</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Notes */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Notes / Terms
        </h3>
        <div className="space-y-2">
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <div>
                <textarea
                  {...field}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Additional notes or terms"
                />
              </div>
            )}
          />
        </div>
      </div>
    </form>
  );
};

export default InvoiceForm;
