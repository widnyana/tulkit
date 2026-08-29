import type { InvoiceData } from "@/lib/invoice/types";
import { formatCurrency } from "@/lib/invoice/formatCurrency";
import { Text, View } from "@react-pdf/renderer";
import { evergreenTemplateStyles as s } from "../styles";

interface ItemsTableProps {
  invoiceData: InvoiceData;
}

// A row (with notes) measures ~34-48pt. Requiring 56pt of presence below each
// row guarantees a row never splits across a page boundary — the row moves to
// the next page whole instead.
const ROW_MIN_PRESENCE = 56;

export const EvergreenTemplateItemsTable = ({
  invoiceData,
}: ItemsTableProps) => {
  const currency = invoiceData.currency || "$";
  const decimalSep = invoiceData.decimalSeparator || ",";
  const thousandSep = invoiceData.thousandSeparator || ".";

  return (
    // The header is `fixed` *inside* this wrapper, not on the Page. react-pdf
    // duplicates a fixed node into every fragment its immediate parent is split
    // into, so the header repeats on each page the table spans and stops once
    // the wrapper is exhausted - the totals page below never inherits it.
    <View>
      {/* Table header - repeats on every page the table spans */}
      <View style={s.tableHeader} fixed>
        <Text style={s.colDescriptionHeader}>Description</Text>
        <Text style={s.colNarrowHeader}>Qty</Text>
        <Text style={s.colWideHeader}>Price</Text>
        <Text style={s.colWideHeader}>Amount</Text>
      </View>

      {/* Rows: minPresenceAhead keeps each row whole across page breaks */}
      {invoiceData.items.map((item) => (
        <View
          key={item.id}
          style={s.tableRow}
          minPresenceAhead={ROW_MIN_PRESENCE}
        >
          <View style={s.colDescription}>
            <Text>{item.description || ""}</Text>
            {item.notes ? <Text style={s.itemNotes}>{item.notes}</Text> : null}
          </View>
          <Text style={s.colNarrow}>{item.quantity || 0}</Text>
          <Text style={s.colWide}>
            {formatCurrency(
              item.unitPrice || 0,
              currency,
              decimalSep,
              thousandSep,
            )}
          </Text>
          <Text style={s.colWide}>
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
