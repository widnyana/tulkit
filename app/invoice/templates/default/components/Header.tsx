import type { InvoiceData } from "@/lib/invoice/types";
import { Image, Text, View } from "@react-pdf/renderer";
import { defaultTemplateStyles } from "../styles";

interface HeaderProps {
  invoiceData: InvoiceData;
}

export const DefaultTemplateHeader = ({ invoiceData }: HeaderProps) => {
  return (
    <View style={defaultTemplateStyles.header}>
      {invoiceData.logo && (
        <Image src={invoiceData.logo} style={defaultTemplateStyles.logo} />
      )}
      <View style={defaultTemplateStyles.companyInfo}>
        <Text style={defaultTemplateStyles.invoiceTitle}>INVOICE</Text>
        <Text style={defaultTemplateStyles.invoiceNumber}>
          #{invoiceData.invoiceNumber}
        </Text>
      </View>
    </View>
  );
};
