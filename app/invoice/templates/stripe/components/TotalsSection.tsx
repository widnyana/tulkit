import type { InvoiceData } from "@/lib/invoice/types";
import { formatNumber } from "@/lib/invoice/formatNumber";
import { Text, View } from "@react-pdf/renderer";
import { stripeTemplateStyles as s } from "../styles";

interface TotalsSectionProps {
  invoiceData: InvoiceData;
}

export const StripeTemplateTotalsSection = ({
  invoiceData,
}: TotalsSectionProps) => {
  const subtotal = invoiceData.items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
    0,
  );
  const taxAmount = invoiceData.taxRate
    ? (subtotal * (invoiceData.taxRate || 0)) / 100
    : 0;
  const total = subtotal + taxAmount;
  const currency = invoiceData.currency || "$";
  const decimalSep = invoiceData.decimalSeparator || ",";
  const thousandSep = invoiceData.thousandSeparator || ".";

  return (
    <View style={[s.mt16, { alignItems: "flex-end" }]}>
      <View style={{ width: 240 }}>
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Subtotal</Text>
          <Text style={s.totalValue}>
            {currency}
            {formatNumber(subtotal, 2, decimalSep, thousandSep)}
          </Text>
        </View>

        {/* Always render tax row to avoid reconciliation bugs */}
        <View
          style={[
            s.totalRow,
            {
              display:
                invoiceData.taxRate && invoiceData.taxRate > 0
                  ? "flex"
                  : "none",
            },
          ]}
        >
          <Text style={s.totalLabel}>Tax ({invoiceData.taxRate || 0}%)</Text>
          <Text style={s.totalValue}>
            {currency}
            {formatNumber(taxAmount, 2, decimalSep, thousandSep)}
          </Text>
        </View>

        <View style={s.grandTotal}>
          <Text style={s.grandTotalLabel}>Total</Text>
          <Text style={s.grandTotalValue}>
            {currency}
            {formatNumber(total, 2, decimalSep, thousandSep)}
          </Text>
        </View>
      </View>
    </View>
  );
};
