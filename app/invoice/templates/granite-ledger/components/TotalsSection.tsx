import { formatCurrency } from "@/lib/invoice/formatCurrency";
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
  const currency = invoiceData.currency || "$";
  const decimalSep = invoiceData.decimalSeparator || ",";
  const thousandSep = invoiceData.thousandSeparator || ".";

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
    <View style={graniteTemplateStyles.totalsTable} wrap={false}>
      {/* Subtotal */}
      <View style={graniteTemplateStyles.totalsRow}>
        <Text style={graniteTemplateStyles.totalsLabel}>Subtotal:</Text>
        <Text style={graniteTemplateStyles.value}>
          {formatCurrency(subtotal, currency, decimalSep, thousandSep)}
        </Text>
      </View>

      {/* Tax (if enabled) */}
      {invoiceData.taxEnabled && (
        <View style={graniteTemplateStyles.totalsRow}>
          <Text style={graniteTemplateStyles.totalsLabel}>
            Tax ({invoiceData.taxRate}%):
          </Text>
          <Text style={graniteTemplateStyles.value}>
            {formatCurrency(taxAmount, currency, decimalSep, thousandSep)}
          </Text>
        </View>
      )}

      {/* Total - with accent color */}
      <View style={graniteTemplateStyles.totalsLastRow}>
        <Text
          style={[
            graniteTemplateStyles.totalsLabel,
            graniteTemplateStyles.totalsLastText,
          ]}
        >
          Total:
        </Text>
        <Text
          style={[
            graniteTemplateStyles.value,
            graniteTemplateStyles.totalsLastText,
          ]}
        >
          {formatCurrency(total, currency, decimalSep, thousandSep)}
        </Text>
      </View>
    </View>
  );
};
