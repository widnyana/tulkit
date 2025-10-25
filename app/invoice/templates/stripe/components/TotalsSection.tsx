import type { InvoiceData } from "@/lib/invoice/types";
import { Text, View } from "@react-pdf/renderer";
import { stripeTemplateStyles as s } from "../styles";

interface TotalsSectionProps {
  invoiceData: InvoiceData;
}

export const StripeTemplateTotalsSection = ({
  invoiceData,
}: TotalsSectionProps) => {
  const subtotal = invoiceData.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const taxAmount = invoiceData.taxRate
    ? (subtotal * invoiceData.taxRate) / 100
    : 0;
  const total = subtotal + taxAmount;
  const currency = invoiceData.currency;

  return (
    <View style={[s.mt16, { alignItems: "flex-end" }]}>
      <View style={{ width: 240 }}>
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Subtotal</Text>
          <Text style={s.totalValue}>
            {currency}
            {subtotal.toFixed(2)}
          </Text>
        </View>

        {invoiceData.taxRate && invoiceData.taxRate > 0 && (
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Tax ({invoiceData.taxRate}%)</Text>
            <Text style={s.totalValue}>
              {currency}
              {taxAmount.toFixed(2)}
            </Text>
          </View>
        )}

        <View style={s.grandTotal}>
          <Text style={s.grandTotalLabel}>Total</Text>
          <Text style={s.grandTotalValue}>
            {currency}
            {total.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
};
