import type { InvoiceData } from "@/lib/invoice/types";
import { Text, View } from "@react-pdf/renderer";
import { apexTemplateStyles as s } from "../styles";

interface BilledToProps {
  invoiceData: InvoiceData;
}

export const ApexTemplateBilledTo = ({ invoiceData }: BilledToProps) => {
  return (
    <View style={s.infoBox}>
      <Text style={[s.h2, s.mb8]}>Billed To</Text>
      <Text style={[s.bodyBold, s.mb4]}>{invoiceData.recipient.name}</Text>
      <Text style={[s.bodySmall, s.mb2]}>{invoiceData.recipient.address}</Text>
      {invoiceData.recipient.email && (
        <Text style={[s.bodySmall, s.mb2]}>{invoiceData.recipient.email}</Text>
      )}
      {invoiceData.recipient.phone && (
        <Text style={s.bodySmall}>{invoiceData.recipient.phone}</Text>
      )}
    </View>
  );
};
