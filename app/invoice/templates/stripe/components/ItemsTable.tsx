import type { InvoiceData } from "@/lib/invoice/types";
import { Text, View } from "@react-pdf/renderer";
import { stripeTemplateStyles as s } from "../styles";

interface ItemsTableProps {
  invoiceData: InvoiceData;
}

export const StripeTemplateItemsTable = ({ invoiceData }: ItemsTableProps) => {
  const currency = invoiceData.currency;

  return (
    <View style={s.mt20}>
      {/* Table Header */}
      <View style={s.tableHeader}>
        <Text style={[s.label, { flex: 3 }]}>Description</Text>
        <Text style={[s.label, { flex: 0.8, textAlign: "center" }]}>Qty</Text>
        <Text style={[s.label, { flex: 1, textAlign: "right" }]}>Amount</Text>
      </View>

      {/* Table Rows */}
      {invoiceData.items.map((item, index) => (
        <View key={index} style={s.tableRow}>
          <Text style={[s.tableCell, { flex: 3 }]}>{item.description}</Text>
          <Text style={[s.tableCellGray, { flex: 0.8, textAlign: "center" }]}>
            {item.quantity}
          </Text>
          <Text style={[s.tableCell, { flex: 1, textAlign: "right", fontWeight: 500 }]}>
            {currency}
            {(item.quantity * item.unitPrice).toFixed(2)}
          </Text>
        </View>
      ))}
    </View>
  );
};
