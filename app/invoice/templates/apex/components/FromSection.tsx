import type { InvoiceData } from "@/lib/invoice/types";
import { Text, View } from "@react-pdf/renderer";
import { apexTemplateStyles as s } from "../styles";

interface FromSectionProps {
  invoiceData: InvoiceData;
}

export const ApexTemplateFromSection = ({ invoiceData }: FromSectionProps) => {
  return (
    <View style={s.fromSection}>
      <Text style={[s.fromTitle, s.mb6]}>From</Text>
      <Text style={[s.bodyBold, s.mb4]}>{invoiceData.sender.name}</Text>
      <Text style={[s.bodySmall, s.mb2]}>{invoiceData.sender.address}</Text>
      <Text style={[s.bodySmall, s.mb2]}>{invoiceData.sender.email}</Text>
      <Text style={s.bodySmall}>{invoiceData.sender.phone}</Text>
    </View>
  );
};
