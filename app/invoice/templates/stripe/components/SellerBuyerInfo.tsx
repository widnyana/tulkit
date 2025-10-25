import { View, Text } from "@react-pdf/renderer";
import { InvoiceData } from "../../../../../../../lib/types";
import { stripeTemplateStyles } from "../styles";

interface SellerBuyerInfoProps {
  invoiceData: InvoiceData;
}

export const StripeTemplateSellerBuyerInfo = ({
  invoiceData,
}: SellerBuyerInfoProps) => {
  return (
    <View style={[stripeTemplateStyles.row, stripeTemplateStyles.mb24]}>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            stripeTemplateStyles.fontSize10,
            stripeTemplateStyles.textGray,
            stripeTemplateStyles.mb4,
          ]}
        >
          From
        </Text>
        <Text
          style={[
            stripeTemplateStyles.fontSize12,
            stripeTemplateStyles.textDark,
          ]}
        >
          {invoiceData.sender.name}
        </Text>
        <Text
          style={[
            stripeTemplateStyles.fontSize10,
            stripeTemplateStyles.textDark,
          ]}
        >
          {invoiceData.sender.address}
        </Text>
        <Text
          style={[
            stripeTemplateStyles.fontSize10,
            stripeTemplateStyles.textDark,
          ]}
        >
          {invoiceData.sender.email}
        </Text>
        <Text
          style={[
            stripeTemplateStyles.fontSize10,
            stripeTemplateStyles.textDark,
          ]}
        >
          {invoiceData.sender.phone}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            stripeTemplateStyles.fontSize10,
            stripeTemplateStyles.textGray,
            stripeTemplateStyles.mb4,
          ]}
        >
          Bill To
        </Text>
        <Text
          style={[
            stripeTemplateStyles.fontSize12,
            stripeTemplateStyles.textDark,
          ]}
        >
          {invoiceData.recipient.name}
        </Text>
        <Text
          style={[
            stripeTemplateStyles.fontSize10,
            stripeTemplateStyles.textDark,
          ]}
        >
          {invoiceData.recipient.address}
        </Text>
      </View>
    </View>
  );
};
