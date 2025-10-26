import type { InvoiceData } from "@/lib/invoice/types";
import { Image, Text, View } from "@react-pdf/renderer";
import type React from "react";
import { graniteTemplateStyles } from "../styles";

interface GraniteTemplateHeaderProps {
  invoiceData: InvoiceData;
}

export const GraniteTemplateHeader: React.FC<GraniteTemplateHeaderProps> = ({
  invoiceData,
}) => {
  return (
    <View style={graniteTemplateStyles.header}>
      <View>
        {invoiceData.logo && (
          <Image src={invoiceData.logo} style={graniteTemplateStyles.logo} />
        )}
        <Text style={graniteTemplateStyles.headerTitle}>
          {invoiceData.sender.name || "Company Name"}
        </Text>
      </View>
      <View style={{ width: "auto", alignItems: "flex-end" }}>
        <Text style={graniteTemplateStyles.headerTitle}>INVOICE</Text>
        <Text style={graniteTemplateStyles.headerInvoiceNumber}>
          #{invoiceData.invoiceNumber}
        </Text>
      </View>
    </View>
  );
};
