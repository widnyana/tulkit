import { View, Text } from "@react-pdf/renderer";
import { InvoiceData } from "../../../../../../lib/types";
import { defaultTemplateStyles } from "../styles";

interface TotalsSectionProps {
  invoiceData: InvoiceData;
}

export const DefaultTemplateTotalsSection = ({
  invoiceData,
}: TotalsSectionProps) => {
  // Calculate totals
  const subtotal = invoiceData.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const taxAmount = invoiceData.taxEnabled
    ? subtotal * (invoiceData.taxRate / 100)
    : 0;
  const total = subtotal + taxAmount;

  return (
    <View style={defaultTemplateStyles.totals}>
      <View style={defaultTemplateStyles.totalsTable}>
        <View style={defaultTemplateStyles.totalsRow}>
          <Text>Subtotal:</Text>
          <Text>${subtotal.toFixed(2)}</Text>
        </View>
        {invoiceData.taxEnabled && (
          <View style={defaultTemplateStyles.totalsRow}>
            <Text>Tax ({invoiceData.taxRate}%):</Text>
            <Text>${taxAmount.toFixed(2)}</Text>
          </View>
        )}
        <View
          style={[
            defaultTemplateStyles.totalsRow,
            { borderTopWidth: 1, borderTopColor: "#000" },
          ]}
        >
          <Text style={defaultTemplateStyles.totalsLabel}>Total:</Text>
          <Text style={defaultTemplateStyles.totalsLabel}>
            ${total.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
};
