import type { InvoiceData } from "@/lib/invoice/types";
import { Text, View } from "@react-pdf/renderer";
import { apexTemplateStyles as s } from "../styles";

interface TotalsSectionProps {
  invoiceData: InvoiceData;
}

export const ApexTemplateTotalsSection = ({
  invoiceData,
}: TotalsSectionProps) => {
  const currency = invoiceData.currency || "$";
  const decimalSep = invoiceData.decimalSeparator || ",";
  const thousandSep = invoiceData.thousandSeparator || ".";

  const formatCurrency = (amount: number) => {
    const parts = amount.toFixed(2).split(".");
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep);
    return `${currency}${integerPart}${decimalSep}${parts[1]}`;
  };

  const subtotal = invoiceData.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const taxAmount = invoiceData.taxEnabled
    ? subtotal * (invoiceData.taxRate / 100)
    : 0;
  const total = subtotal + taxAmount;

  return (
    <View style={s.totalsContainer}>
      {/* Subtotal */}
      <View style={s.totalRow}>
        <Text style={s.totalLabel}>Subtotal</Text>
        <Text style={s.totalValue}>{formatCurrency(subtotal)}</Text>
      </View>

      {/* Tax */}
      {invoiceData.taxEnabled && (
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Tax ({invoiceData.taxRate}%)</Text>
          <Text style={s.totalValue}>{formatCurrency(taxAmount)}</Text>
        </View>
      )}

      {/* Grand Total */}
      <View style={s.grandTotal}>
        <Text style={s.grandTotalLabel}>Total Due</Text>
        <Text style={s.grandTotalValue}>{formatCurrency(total)}</Text>
      </View>
    </View>
  );
};
