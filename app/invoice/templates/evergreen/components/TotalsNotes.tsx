import type { InvoiceData } from "@/lib/invoice/types";
import { formatNumber } from "@/lib/invoice/formatNumber";
import { Text, View } from "@react-pdf/renderer";
import { EvergreenTemplatePaymentInfo } from "./PaymentInfo";
import { evergreenTemplateStyles as s } from "../styles";

interface TotalsNotesProps {
  invoiceData: InvoiceData;
}

export const EvergreenTemplateTotalsNotes = ({
  invoiceData,
}: TotalsNotesProps) => {
  const currency = invoiceData.currency || "$";
  const decimalSep = invoiceData.decimalSeparator || ",";
  const thousandSep = invoiceData.thousandSeparator || ".";

  const subtotal = invoiceData.items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
    0,
  );
  const taxAmount = invoiceData.taxEnabled
    ? (subtotal * (invoiceData.taxRate || 0)) / 100
    : 0;
  const total = subtotal + taxAmount;

  const fmt = (n: number) => formatNumber(n, 2, decimalSep, thousandSep);

  return (
    // wrap={false}: the whole cluster moves to the next page as one unit, so
    // the Total Due never orphans from the last table row.
    <View style={s.bottomCluster} wrap={false}>
      <View style={s.notesCol}>
        {invoiceData.notes ? (
          <>
            <Text style={s.label}>NOTES / TERMS</Text>
            <Text style={s.notesText}>{invoiceData.notes}</Text>
          </>
        ) : null}
        <EvergreenTemplatePaymentInfo invoiceData={invoiceData} />
      </View>
      <View style={s.totalsCol}>
        <View style={s.totalsRow}>
          <Text style={s.totalsLabel}>Subtotal</Text>
          <Text style={s.totalsValue}>
            {currency}
            {fmt(subtotal)}
          </Text>
        </View>
        {/* Always render tax row to avoid reconciliation bugs */}
        <View
          style={[
            s.totalsRow,
            {
              display:
                invoiceData.taxEnabled && invoiceData.taxRate > 0
                  ? "flex"
                  : "none",
            },
          ]}
        >
          <Text style={s.totalsLabel}>Tax ({invoiceData.taxRate || 0}%)</Text>
          <Text style={s.totalsValue}>
            {currency}
            {fmt(taxAmount)}
          </Text>
        </View>
        <View style={s.totalsDueRow}>
          <Text style={s.totalsDueLabel}>TOTAL DUE</Text>
          <Text style={s.totalsDueValue}>
            {currency}
            {fmt(total)}
          </Text>
        </View>
      </View>
    </View>
  );
};
