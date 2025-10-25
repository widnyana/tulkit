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
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const taxAmount = invoiceData.taxRate
    ? (subtotal * invoiceData.taxRate) / 100
    : 0;
  const total = subtotal + taxAmount;
  const currency = invoiceData.currency;

  return (
    <View style={styles.totalsTable}>
      <View style={styles.totalsRow}>
        <Text style={styles.totalsLabel}>Subtotal:</Text>
        <Text style={styles.value}>
          {currency}
          {subtotal.toFixed(2)}
        </Text>
      </View>

      {invoiceData.taxRate && invoiceData.taxRate > 0 && (
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>Tax ({invoiceData.taxRate}%):</Text>
          <Text style={styles.value}>
            {currency}
            {taxAmount.toFixed(2)}
          </Text>
        </View>
      )}

      <View style={styles.totalsLastRow}>
        <Text style={styles.totalsLabel}>Total:</Text>
        <Text style={styles.value}>
          {currency}
          {total.toFixed(2)}
        </Text>
      </View>
    </View>
  );
};
