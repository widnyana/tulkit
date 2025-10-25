import { View, Text } from "@react-pdf/renderer";
import { InvoiceData } from "../../../../../../../lib/types";
import { stripeTemplateStyles } from "../styles";

interface DueAmountProps {
  invoiceData: InvoiceData;
}

export const StripeTemplateDueAmount = ({ invoiceData }: DueAmountProps) => {
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
    <View style={stripeTemplateStyles.dueAmountBox}>
      <Text
        style={[
          stripeTemplateStyles.fontSize10,
          stripeTemplateStyles.textGray,
          stripeTemplateStyles.mb1,
        ]}
      >
        AMOUNT DUE
      </Text>
      <Text
        style={[
          stripeTemplateStyles.fontSize24,
          stripeTemplateStyles.fontBold,
          stripeTemplateStyles.textDark,
        ]}
      >
        ${total.toFixed(2)}
      </Text>
    </View>
  );
};
