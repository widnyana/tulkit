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

      {/* Bill To section */}
      <View style={{ width: "50%" }}>
        <Text style={[s.label, s.mb6]}>Bill To</Text>
        <Text style={[s.body, { fontWeight: 600 }, s.mb4]}>
          {invoiceData.recipient.name || ""}
        </Text>
        <Text style={[s.bodySmall, s.mb4]}>
          {invoiceData.recipient.address || ""}
        </Text>
        {/* Always render optional fields to avoid reconciliation bugs */}
        <Text
          style={[
            s.bodySmall,
            { display: invoiceData.recipient.email ? "flex" : "none" },
          ]}
        >
          {invoiceData.recipient.email || ""}
        </Text>
        <Text
          style={[
            s.bodySmall,
            { display: invoiceData.recipient.phone ? "flex" : "none" },
          ]}
        >
          {invoiceData.recipient.phone || ""}
        </Text>
      </View>


      {/* From section */}
      <View style={{ width: "50%", alignItems: "flex-end" }}>
        <Text style={[s.label, s.mb6]}>From</Text>
        <Text style={[s.body, { fontWeight: 600 }, s.mb4]}>
          {invoiceData.sender.name || ""}
        </Text>
        <Text style={[s.bodySmall, s.mb4]}>
          {invoiceData.sender.address || ""}
        </Text>
        <Text style={s.bodySmall}>{invoiceData.sender.email || ""}</Text>
        {/* Always render phone container to avoid reconciliation bugs */}
        <Text
          style={[
            s.bodySmall,
            { display: invoiceData.sender.phone ? "flex" : "none" },
          ]}
        >
          {invoiceData.sender.phone || ""}
        </Text>
      </View>
    </View>
  );
};
