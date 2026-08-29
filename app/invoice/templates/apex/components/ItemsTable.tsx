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
    <View style={s.mb24}>
      {/* Table Header */}
      <View style={s.tableHeader}>
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
        <View
          key={item.id}
          style={[s.tableRow, index % 2 === 1 ? s.tableRowAlt : {}]}
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
