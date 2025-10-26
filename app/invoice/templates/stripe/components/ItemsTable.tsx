import type { InvoiceData } from "@/lib/invoice/types";
import { formatNumber } from "@/lib/invoice/formatNumber";
import { Text, View } from "@react-pdf/renderer";
import { stripeTemplateStyles as s } from "../styles";

interface ItemsTableProps {
  invoiceData: InvoiceData;
}

export const StripeTemplateItemsTable = ({ invoiceData }: ItemsTableProps) => {
  const currency = invoiceData.currency || "$";
  const decimalSep = invoiceData.decimalSeparator || ",";
  const thousandSep = invoiceData.thousandSeparator || ".";

  return (
    <View style={s.mt20}>
      {/* Table Header */}
      <View style={s.tableHeader}>
        <Text style={[s.label, { flex: 3 }]}>Description</Text>
        <Text style={[s.label, { flex: 0.8, textAlign: "center" }]}>Qty</Text>
        <Text style={[s.label, { flex: 1, textAlign: "right" }]}>Amount</Text>
      </View>

      {/* Table Rows - Use stable item.id as key */}
      {invoiceData.items.map((item) => (
        <View key={item.id} style={s.tableRow}>
          <View style={{ flex: 3 }}>
            <Text style={s.tableCell}>{item.description || ""}</Text>
            {item.notes && item.notes.trim().length > 0 && (
              <Text
                style={[
                  s.tableCellGray,
                  { fontSize: 8, lineHeight: 1.3, marginTop: 2 },
                ]}
              >
                {item.notes}
              </Text>
            )}
          </View>
          <Text style={[s.tableCellGray, { flex: 0.8, textAlign: "center" }]}>
            {item.quantity || 0}
          </Text>
          <Text
            style={[
              s.tableCell,
              { flex: 1, textAlign: "right", fontWeight: 500 },
            ]}
          >
            {currency}
            {formatNumber(
              (item.quantity || 0) * (item.unitPrice || 0),
              2,
              decimalSep,
              thousandSep,
            )}
          </Text>
        </View>
      ))}
    </View>
  );
};
