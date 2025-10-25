import type { InvoiceData } from "@/lib/invoice/types";
import { Text, View } from "@react-pdf/renderer";
import { stripeTemplateStyles } from "../styles";

interface DueAmountProps {
  invoiceData: InvoiceData;
}
const styles = stripeTemplateStyles;

export const StripeTemplateDueAmount = ({
  invoiceData,
}: DueAmountProps) => {
  const subtotal = invoiceData.items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );
  const taxAmount = invoiceData.taxRate
    ? (subtotal * invoiceData.taxRate) / 100
    : 0;
  const total = subtotal + taxAmount;
  const currency = invoiceData.currency;

  return (
    <View style={styles.dueAmountSection}>
      <Text style={styles.amountDueLabel}>Amount due</Text>
      <Text style={styles.amountDueValue}>
        {currency}
        {total.toFixed(2)}
      </Text>
    </View>
  );
}
