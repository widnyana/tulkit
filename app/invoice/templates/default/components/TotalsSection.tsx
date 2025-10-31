import type { InvoiceData } from "@/lib/invoice/types";
import { formatNumber } from "@/lib/invoice/formatNumber";
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
    <View style={styles.totalsTable}>
      <View style={styles.totalsRow}>
        <Text style={styles.totalsLabel}>Subtotal:</Text>
        <Text style={styles.value}>
          {currency}
          {formatNumber(subtotal, 2, decimalSep, thousandSep)}
        </Text>
      </View>

      {/* Always render tax row to avoid reconciliation bugs */}
      <View
        style={[
          styles.totalsRow,
          {
            display:
              invoiceData.taxEnabled && invoiceData.taxRate > 0
                ? "flex"
                : "none",
          },
        ]}
      >
        <Text style={styles.totalsLabel}>
          Tax ({invoiceData.taxRate || 0}%):
        </Text>
        <Text style={styles.value}>
          {currency}
          {formatNumber(taxAmount, 2, decimalSep, thousandSep)}
        </Text>
      </View>

      <View style={styles.totalsLastRow}>
        <Text style={styles.totalsLabel}>Total:</Text>
        <Text style={styles.value}>
          {currency}
          {formatNumber(total, 2, decimalSep, thousandSep)}
        </Text>
      </View>
    </View>
  );
};
