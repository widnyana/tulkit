import type { InvoiceData } from "@/lib/invoice/types";
import { Text, View } from "@react-pdf/renderer";
import { stripeTemplateStyles } from "../styles";

interface TotalsSectionProps {
  invoiceData: InvoiceData;
}

export const StripeTemplateTotalsSection = ({
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
    <View
      style={[stripeTemplateStyles.totalsSection, stripeTemplateStyles.mb16]}
    >
      <View style={stripeTemplateStyles.totalRow}>
        <Text
          style={[
            stripeTemplateStyles.fontSize10,
            stripeTemplateStyles.textGray,
          ]}
        >
          Subtotal
        </Text>
        <Text
          style={[
            stripeTemplateStyles.fontSize10,
            stripeTemplateStyles.textDark,
          ]}
        >
          ${subtotal.toFixed(2)}
        </Text>
      </View>
      {invoiceData.taxEnabled && (
        <View style={stripeTemplateStyles.totalRow}>
          <Text
            style={[
              stripeTemplateStyles.fontSize10,
              stripeTemplateStyles.textGray,
            ]}
          >
            Tax ({invoiceData.taxRate}%)
          </Text>
          <Text
            style={[
              stripeTemplateStyles.fontSize10,
              stripeTemplateStyles.textDark,
            ]}
          >
            ${taxAmount.toFixed(2)}
          </Text>
        </View>
      )}
      <View
        style={[
          stripeTemplateStyles.totalRow,
          stripeTemplateStyles.borderTop,
          { paddingTop: 4 },
        ]}
      >
        <Text
          style={[
            stripeTemplateStyles.fontSize12,
            stripeTemplateStyles.fontBold,
            stripeTemplateStyles.textDark,
          ]}
        >
          Total
        </Text>
        <Text
          style={[
            stripeTemplateStyles.fontSize12,
            stripeTemplateStyles.fontBold,
            stripeTemplateStyles.textDark,
          ]}
        >
          ${total.toFixed(2)}
        </Text>
      </View>
    </View>
  );
};
