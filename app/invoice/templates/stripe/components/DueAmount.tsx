import { formatCurrency } from "@/lib/invoice/formatCurrency";
import type { InvoiceData } from "@/lib/invoice/types";
import { Text, View } from "@react-pdf/renderer";
import { stripeTemplateStyles as s } from "../styles";

interface DueAmountProps {
  invoiceData: InvoiceData;
}

export const StripeTemplateDueAmount = ({ invoiceData }: DueAmountProps) => {
  const subtotal = invoiceData.items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
    0,
  );
  const taxAmount = invoiceData.taxEnabled
    ? (subtotal * (invoiceData.taxRate || 0)) / 100
    : 0;
  const total = subtotal + taxAmount;
  const currency = invoiceData.currency || "$";
  const decimalSep = invoiceData.decimalSeparator || ",";
  const thousandSep = invoiceData.thousandSeparator || ".";

  return (
    <View style={[s.spaceBetween, s.mb8]}>
      <View style={{ flex: 1 }} />
      <View style={{ width: 150, alignItems: "flex-end" }}>
        <View
          style={{
            backgroundColor: "#F6F9FC",
            padding: 12,
            borderRadius: 4,
          }}
        >
          <Text
            style={{
              fontSize: 9,
              color: "#635BFF",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              marginBottom: 4,
            }}
          >
            Amount Due
          </Text>
          <Text
            style={{
              fontSize: 22,
              color: "#0A2540",
              fontWeight: 700,
            }}
          >
            {formatCurrency(total, currency, decimalSep, thousandSep)}
          </Text>
        </View>
      </View>
    </View>
  );
};
