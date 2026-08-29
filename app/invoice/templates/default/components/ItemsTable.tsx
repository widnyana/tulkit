import type { InvoiceData } from "@/lib/invoice/types";
import { formatCurrency } from "@/lib/invoice/formatCurrency";
import { Text, View } from "@react-pdf/renderer";
import { defaultTemplateStyles } from "../styles";

const styles = defaultTemplateStyles;

interface ItemsTableProps {
  invoiceData: InvoiceData;
}

export const DefaultTemplateItemsTable = ({ invoiceData }: ItemsTableProps) => {
  const currency = invoiceData.currency || "$";
  const decimalSep = invoiceData.decimalSeparator || ",";
  const thousandSep = invoiceData.thousandSeparator || ".";

  return (
    <View style={styles.table}>
      {/* Table Header Row */}
      <View style={[styles.tableRow, styles.headerRow]}>
        <Text style={styles.descriptionColHeader}>Description</Text>
        <Text style={styles.narrowColHeader}>Qty</Text>
        <Text style={styles.narrowColHeader}>Price</Text>
        <Text style={styles.narrowColHeader}>Amount</Text>
      </View>

      {/* Table Body Rows */}
      {invoiceData.items.map((item) => (
        <View key={item.id} style={styles.tableRow}>
          <Text style={styles.descriptionCol}>
            {item.description || ""}
            {item.notes && (
              <>
                <Text>{"\n"}</Text>
                <Text style={styles.itemNotesLabel}>{item.notes}</Text>
              </>
            )}
          </Text>
          <Text style={styles.narrowCol}>{item.quantity || 0}</Text>
          <Text style={styles.narrowCol}>
            {formatCurrency(
              item.unitPrice || 0,
              currency,
              decimalSep,
              thousandSep,
            )}
          </Text>
          <Text style={styles.narrowCol}>
            {formatCurrency(
              (item.quantity || 0) * (item.unitPrice || 0),
              currency,
              decimalSep,
              thousandSep,
            )}
          </Text>
        </View>
      ))}
    </View>
  );
};
