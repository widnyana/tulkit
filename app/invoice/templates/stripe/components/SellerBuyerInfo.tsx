import type { InvoiceData } from "@/lib/invoice/types";
import { Text, View } from "@react-pdf/renderer";
import { stripeTemplateStyles } from "../styles";

interface SellerBuyerInfoProps {
  invoiceData: InvoiceData;
}

export const StripeTemplateSellerBuyerInfo = ({
  invoiceData,
}: SellerBuyerInfoProps) => {
  return (
    <View
      style={[
        { flexDirection: "row", justifyContent: "space-between" },
        stripeTemplateStyles.mb24,
      ]}
    >
      {/* From section - left aligned */}
      <View style={{ flex: 1, maxWidth: "45%" }}>
        <Text
          style={[
            stripeTemplateStyles.fontSize10,
            stripeTemplateStyles.fontMedium,
            stripeTemplateStyles.textGray,
            stripeTemplateStyles.mb2,
          ]}
        >
          From
        </Text>
        <Text
          style={[
            stripeTemplateStyles.fontSize12,
            stripeTemplateStyles.fontBold,
            stripeTemplateStyles.textDark,
            stripeTemplateStyles.mb2,
          ]}
        >
          {invoiceData.sender.name}
        </Text>
        <Text
          style={[
            stripeTemplateStyles.fontSize10,
            stripeTemplateStyles.textDark,
            { lineHeight: 1.4 },
          ]}
        >
          {invoiceData.sender.address}
        </Text>
        <Text
          style={[
            stripeTemplateStyles.fontSize10,
            stripeTemplateStyles.textDark,
            stripeTemplateStyles.mt4,
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

      {/* Bill To section - right aligned */}
      <View style={{ flex: 1, maxWidth: "45%", alignItems: "flex-end" }}>
        <Text
          style={[
            stripeTemplateStyles.fontSize10,
            stripeTemplateStyles.fontMedium,
            stripeTemplateStyles.textGray,
            stripeTemplateStyles.mb2,
          ]}
        >
          Bill To
        </Text>
        <Text
          style={[
            stripeTemplateStyles.fontSize12,
            stripeTemplateStyles.fontBold,
            stripeTemplateStyles.textDark,
            stripeTemplateStyles.mb2,
            { textAlign: "right" },
          ]}
        >
          {invoiceData.recipient.name}
        </Text>
        <Text
          style={[
            stripeTemplateStyles.fontSize10,
            stripeTemplateStyles.textDark,
            { textAlign: "right", lineHeight: 1.0 },
          ]}
        >
          {invoiceData.recipient.address}
        </Text>
      </View>
    </View>
  );
};
