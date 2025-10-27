import type { InvoiceData } from "@/lib/invoice/types";
import { Image, Text, View } from "@react-pdf/renderer";
import { defaultTemplateStyles } from "../styles";

interface HeaderProps {
  invoiceData: InvoiceData;
}

export const DefaultTemplateHeader = ({ invoiceData }: HeaderProps) => {
  const hasLogo = invoiceData.logo && invoiceData.logo.length > 0;

  return (
    <View style={defaultTemplateStyles.header}>
      {hasLogo && (
        <View style={{ width: 120 }}>
          <Image
            src={invoiceData.logo}
            style={defaultTemplateStyles.logo}
          />
        </View>
      )}
      <View style={defaultTemplateStyles.companyInfo}>
        <Text style={defaultTemplateStyles.invoiceTitle}>INVOICE</Text>
        <Text style={defaultTemplateStyles.invoiceNumber}>
          #{invoiceData.invoiceNumber || ""}
        </Text>
      </View>
    </View>
  );
};
