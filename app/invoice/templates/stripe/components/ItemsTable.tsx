import type { InvoiceData } from "@/lib/invoice/types";
import { Text, View } from "@react-pdf/renderer";
import { stripeTemplateStyles } from "../styles";

interface ItemsTableProps {
  invoiceData: InvoiceData;
}
const styles = stripeTemplateStyles;
export const StripeTemplateItemsTable = ({ invoiceData }: ItemsTableProps) => {
  const currency = invoiceData.currency;

  return (
    <View style={styles.itemsTable}>
      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, styles.descriptionColumn]}>
          Description
        </Text>
        <Text style={[styles.tableHeaderCell, styles.quantityColumn]}>Qty</Text>
        <Text style={[styles.tableHeaderCell, styles.amountColumn]}>Amount</Text>
      </View>

      {/* Table Rows */}
      {invoiceData.items.map((item, index) => (
        <View key={index} style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.descriptionColumn]}>
            {item.description}
          </Text>
          <Text style={[styles.tableCell, styles.quantityColumn]}>
            {item.quantity}
          </Text>
          <Text style={[styles.tableCell, styles.amountColumn]}>
            {currency}
            {(item.quantity * item.price).toFixed(2)}
          </Text>
        </View>
      ))}
    </View>
  );
}
    