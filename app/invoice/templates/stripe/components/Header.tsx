import type { InvoiceData } from "@/lib/invoice/types";
import { Image, Text, View } from "@react-pdf/renderer";
import { stripeTemplateStyles } from "../styles";

interface HeaderProps {
  invoiceData: InvoiceData;
}

export const StripeTemplateHeader = ({ invoiceData }: HeaderProps) => {
  const hasLogo = invoiceData.logo && invoiceData.logo.length > 0;

  return (
    <View style={[hasLogo ? {} : { marginBottom: 16 }]}>
      {hasLogo ? (
        // Header with logo and title side by side
        <View
          style={[
            stripeTemplateStyles.spaceBetween,
            {
              alignItems: "flex-start",
              minHeight: 50, // Ensure consistent height
            },
          ]}
        >
          <View style={{ flex: 1, alignItems: "flex-start" }}>
            <Text
              style={[
                stripeTemplateStyles.fontSize18,
                stripeTemplateStyles.fontBold,
                stripeTemplateStyles.textDark,
              ]}
            >
              INVOICE
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Image
              src={invoiceData.logo!}
              style={{
                maxWidth: 110,
                maxHeight: 40,
                objectFit: "contain",
              }}
            />
          </View>
        </View>
      ) : (
        // Header with title only
        <Text
          style={[
            stripeTemplateStyles.fontSize18,
            stripeTemplateStyles.fontBold,
            stripeTemplateStyles.textDark,
            stripeTemplateStyles.mb24,
          ]}
        >
          INVOICE
        </Text>
      )}
    </View>
  );
};
