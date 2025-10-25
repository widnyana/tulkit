import type { InvoiceData } from "@/lib/invoice/types";
import { Text, View } from "@react-pdf/renderer";
import { stripeTemplateStyles as s } from "../styles";

interface SellerBuyerInfoProps {
  invoiceData: InvoiceData;
}

export const StripeTemplateSellerBuyerInfo = ({
  invoiceData,
}: SellerBuyerInfoProps) => {
  return (
    <View style={[s.spaceBetween, s.mb24]}>
      {/* From section */}
      <View style={{ width: "45%" }}>
        <Text style={[s.label, s.mb6]}>From</Text>
        <Text style={[s.body, { fontWeight: 600 }, s.mb4]}>
          {invoiceData.sender.name}
        </Text>
        <Text style={[s.bodySmall, s.mb4]}>
          {invoiceData.sender.address}
        </Text>
        <Text style={s.bodySmall}>{invoiceData.sender.email}</Text>
        {invoiceData.sender.phone && (
          <Text style={s.bodySmall}>{invoiceData.sender.phone}</Text>
        )}
      </View>

      {/* Bill To section */}
      <View style={{ width: "45%" }}>
        <Text style={[s.label, s.mb6]}>Bill To</Text>
        <Text style={[s.body, { fontWeight: 600 }, s.mb4]}>
          {invoiceData.recipient.name}
        </Text>
        <Text style={[s.bodySmall, s.mb4]}>
          {invoiceData.recipient.address}
        </Text>
        <Text style={s.bodySmall}>{invoiceData.recipient.email}</Text>
        {invoiceData.recipient.phone && (
          <Text style={s.bodySmall}>{invoiceData.recipient.phone}</Text>
        )}
      </View>
    </View>
  );
};
