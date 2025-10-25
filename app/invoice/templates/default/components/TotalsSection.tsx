import type { InvoiceData } from "@/lib/invoice/types";
import { Text, View } from "@react-pdf/renderer";
import { defaultTemplateStyles } from "../styles";

const styles = defaultTemplateStyles;

interface TotalsSectionProps {
  invoiceData: InvoiceData;
}

export const DefaultTemplateTotalsSection = ({
  invoiceData,
}: TotalsSectionProps) => {
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
    <View style={styles.totalsSection}>
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Subtotal:</Text>
        <Text style={styles.totalValue}>
          {currency}
          {subtotal.toFixed(2)}
        </Text>
      </View>

      {invoiceData.taxRate && invoiceData.taxRate > 0 && (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tax ({invoiceData.taxRate}%):</Text>
          <Text style={styles.totalValue}>
            {currency}
            {taxAmount.toFixed(2)}
          </Text>
        </View>
      )}

      <View style={[styles.totalRow, styles.grandTotalRow]}>
        <Text style={styles.grandTotalLabel}>Total:</Text>
        <Text style={styles.grandTotalValue}>
          {currency}
          {total.toFixed(2)}
        </Text>
      </View>
    </View>
  );
};
