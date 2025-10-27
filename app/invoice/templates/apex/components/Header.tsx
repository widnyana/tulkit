import type { InvoiceData } from "@/lib/invoice/types";
import { Image, Text, View } from "@react-pdf/renderer";
import { apexTemplateStyles as s } from "../styles";

interface HeaderProps {
  invoiceData: InvoiceData;
}

export const ApexTemplateHeader = ({ invoiceData }: HeaderProps) => {
  const hasLogo = invoiceData.logo && invoiceData.logo.length > 0;

  return (
    <View style={s.headerSection}>
      {/* Logo on left */}
      {hasLogo ? (
        <View style={{ flex: 1 }}>
          <Image
            src={invoiceData.logo}
            style={{
              maxWidth: 100,
              maxHeight: 50,
              objectFit: "contain",
            }}
          />
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      {/* Invoice title and number on right */}
      <View style={{ alignItems: "flex-end" }}>
        <View>
          <Text style={s.h1}>INVOICE</Text>
          <View
            style={{
              height: 1,
              backgroundColor: "#FF6B6B",
              marginTop: 4,
              width: "100%",
            }}
          />
        </View>
        <Text style={[s.body, s.mt8]}>#{invoiceData.invoiceNumber}</Text>
      </View>
    </View>
  );
};
