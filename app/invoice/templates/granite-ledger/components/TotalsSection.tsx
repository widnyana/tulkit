import type { InvoiceData } from "@/lib/invoice/types";
import { Text, View } from "@react-pdf/renderer";
import type React from "react";
import { graniteTemplateStyles } from "../styles";

interface GraniteTemplateTotalsSectionProps {
  invoiceData: InvoiceData;
}

export const GraniteTemplateTotalsSection: React.FC<
  GraniteTemplateTotalsSectionProps
> = ({ invoiceData }) => {
  // Calculate totals
  const subtotal = invoiceData.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );

  const taxAmount = invoiceData.taxEnabled
    ? subtotal * (invoiceData.taxRate / 100)
    : 0;

  const total = subtotal + taxAmount;

  return (
    <View style={graniteTemplateStyles.totalsTable}>
      {/* Subtotal */}
      <View style={graniteTemplateStyles.totalsRow}>
        <Text style={graniteTemplateStyles.totalsLabel}>Subtotal:</Text>
        <Text style={graniteTemplateStyles.value}>
          {invoiceData.currency}
          {subtotal.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
      </View>

      {/* Tax (if enabled) */}
      {invoiceData.taxEnabled && (
        <View style={graniteTemplateStyles.totalsRow}>
          <Text style={graniteTemplateStyles.totalsLabel}>
            Tax ({invoiceData.taxRate}%):
          </Text>
          <Text style={graniteTemplateStyles.value}>
            {invoiceData.currency}
            {taxAmount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
      )}

      {/* Total - with accent color */}
      <View style={graniteTemplateStyles.totalsLastRow}>
        <Text
          style={[
            graniteTemplateStyles.totalsLabel,
            graniteTemplateStyles.accent,
          ]}
        >
          Total:
        </Text>
        <Text
          style={[graniteTemplateStyles.value, graniteTemplateStyles.accent]}
        >
          {invoiceData.currency}
          {total.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
      </View>
    </View>
  );
};
