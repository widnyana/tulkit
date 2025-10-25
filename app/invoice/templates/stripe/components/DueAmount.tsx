import type { InvoiceData } from "@/lib/invoice/types";
import { Text, View } from "@react-pdf/renderer";
import { stripeTemplateStyles as s } from "../styles";

interface DueAmountProps {
  invoiceData: InvoiceData;
}

export const StripeTemplateDueAmount = ({
  invoiceData,
}: DueAmountProps) => {
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
    <View style={[s.spaceBetween, s.mb16]}>
      <View style={{ flex: 1 }} />
      <View style={{ width: 200 }}>
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
            {currency}
            {total.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
};
