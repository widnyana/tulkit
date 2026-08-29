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
      {/* Table Header Row - fixed inside the table wrapper, so it repeats on
          every page the table spans and on no page after it */}
      <View style={[styles.tableRow, styles.headerRow]} fixed>
        <Text style={styles.descriptionColHeader}>Description</Text>
        <Text style={styles.narrowColHeader}>Qty</Text>
        <Text style={styles.narrowColHeader}>Price</Text>
        <Text style={styles.narrowColHeader}>Amount</Text>
      </View>

      {/* Table Body Rows */}
      {invoiceData.items.map((item) => (
        // wrap={false}: a split row leaves qty/price/amount on one page and
        // the description on the next
        <View key={item.id} style={styles.tableRow} wrap={false}>
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
