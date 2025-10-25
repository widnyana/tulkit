import type { InvoiceData } from "@/lib/invoice/types";
import { Image, Text, View } from "@react-pdf/renderer";
import { stripeTemplateStyles as s } from "../styles";

interface HeaderProps {
  invoiceData: InvoiceData;
}

export const StripeTemplateHeader = ({ invoiceData }: HeaderProps) => {
  const hasLogo = invoiceData.logo && invoiceData.logo.length > 0;

  return (
    <View style={[s.spaceBetween, s.mb24]}>
      <View>
        <Text style={s.h1}>INVOICE</Text>
      </View>
      {hasLogo && (
        <View>
          <Image
            src={invoiceData.logo!}
            style={{
              maxWidth: 90,
              maxHeight: 36,
              objectFit: "contain",
            }}
          />
        </View>
      )}
    </View>
  );
};
