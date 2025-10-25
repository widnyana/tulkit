import { View, Text } from "@react-pdf/renderer";
import { InvoiceData } from "../../../../../../../lib/types";
import { stripeTemplateStyles } from "../styles";

interface InvoiceDetailsProps {
  invoiceData: InvoiceData;
}

export const StripeTemplateInvoiceDetails = ({
  invoiceData,
}: InvoiceDetailsProps) => {
  return (
    <View style={[stripeTemplateStyles.row, stripeTemplateStyles.mb24]}>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            stripeTemplateStyles.fontSize10,
            stripeTemplateStyles.textGray,
            stripeTemplateStyles.mb2,
          ]}
        >
          Invoice Number
        </Text>
        <Text
          style={[
            stripeTemplateStyles.fontSize12,
            stripeTemplateStyles.textDark,
          ]}
        >
          {invoiceData.invoiceNumber}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            stripeTemplateStyles.fontSize10,
            stripeTemplateStyles.textGray,
            stripeTemplateStyles.mb2,
          ]}
        >
          Invoice Date
        </Text>
        <Text
          style={[
            stripeTemplateStyles.fontSize12,
            stripeTemplateStyles.textDark,
          ]}
        >
          {new Date(invoiceData.issueDate).toLocaleDateString()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            stripeTemplateStyles.fontSize10,
            stripeTemplateStyles.textGray,
            stripeTemplateStyles.mb2,
          ]}
        >
          Due Date
        </Text>
        <Text
          style={[
            stripeTemplateStyles.fontSize12,
            stripeTemplateStyles.textDark,
          ]}
        >
          {new Date(invoiceData.dueDate).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
};
