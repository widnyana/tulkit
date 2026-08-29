import { formatCurrency as formatMoney } from "@/lib/invoice/formatCurrency";
import type { InvoiceData } from "@/lib/invoice/types";
import { Text, View } from "@react-pdf/renderer";
import { apexTemplateStyles as s } from "../styles";

interface ItemsTableProps {
  invoiceData: InvoiceData;
}

export const ApexTemplateItemsTable = ({ invoiceData }: ItemsTableProps) => {
  const currency = invoiceData.currency || "$";
  const decimalSep = invoiceData.decimalSeparator || ",";
  const thousandSep = invoiceData.thousandSeparator || ".";

  const formatCurrency = (amount: number) =>
    formatMoney(amount, currency, decimalSep, thousandSep);

  return (
    // No bottom margin on the wrapper: react-pdf counts trailing margin when
    // deciding whether a node fits, which pushes a table that fills the page
    // exactly onto the next one whole. The spacing lives on the row below.
    <View>
      {/* Table Header - fixed inside the table wrapper, so it repeats on every
          page the table spans and on no page after it */}
      <View style={s.tableHeader} fixed>
        <Text style={[s.tableHeaderText, { flex: 3 }]}>Description</Text>
        <Text style={[s.tableHeaderText, { width: 60, textAlign: "center" }]}>
          Qty
        </Text>
        <Text style={[s.tableHeaderText, { width: 90, textAlign: "right" }]}>
          Unit Price
        </Text>
        <Text style={[s.tableHeaderText, { width: 90, textAlign: "right" }]}>
          Amount
        </Text>
      </View>

      {/* Table Rows */}
      {invoiceData.items.map((item, index) => (
        // wrap={false}: a split row leaves the numeric cells on one page and
        // the description on the next
        <View
          key={item.id}
          style={[s.tableRow, index % 2 === 1 ? s.tableRowAlt : {}]}
          wrap={false}
        >
          <View style={{ flex: 3 }}>
            <Text style={s.tableCell}>{item.description}</Text>
            {item.notes && (
              <Text style={[s.bodySmall, s.mt4]}>{item.notes}</Text>
            )}
          </View>
          <Text style={[s.tableCell, { width: 60, textAlign: "center" }]}>
            {item.quantity}
          </Text>
          <Text style={[s.tableCell, { width: 90, textAlign: "right" }]}>
            {formatCurrency(item.unitPrice)}
          </Text>
          <Text style={[s.tableCell, { width: 90, textAlign: "right" }]}>
            {formatCurrency(item.quantity * item.unitPrice)}
          </Text>
        </View>
      ))}
    </View>
  );
};
