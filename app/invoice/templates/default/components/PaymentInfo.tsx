import type { InvoiceData } from "@/lib/invoice/types";
import { Image, Text, View } from "@react-pdf/renderer";
import { defaultTemplateStyles as styles } from "../styles";

interface PaymentInfoProps {
  invoiceData: InvoiceData;
}

// The payload carries paymentInfo and every other template renders it. This
// one dropped it silently, so bank details never reached the page.
export const DefaultTemplatePaymentInfo = ({
  invoiceData,
}: PaymentInfoProps) => {
  const info = invoiceData.paymentInfo;
  if (!info) return null;

  const rows: [string, string][] = [];
  if (info.bankName) rows.push(["Bank Name:", info.bankName]);
  if (info.accountNumber) rows.push(["Account Number:", info.accountNumber]);
  if (info.routingCode) rows.push(["Routing/SWIFT:", info.routingCode]);
  if (info.paymentMethods?.length)
    rows.push(["Accepted Methods:", info.paymentMethods.join(", ")]);

  if (rows.length === 0 && !info.paymentQRCode) return null;

  return (
    <View style={styles.paymentSection} wrap={false}>
      <Text style={styles.paymentTitle}>Payment Information</Text>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>{label}</Text>
          <Text style={styles.paymentValue}>{value}</Text>
        </View>
      ))}
      {info.paymentQRCode && (
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Payment QR Code:</Text>
          <Image
            src={info.paymentQRCode}
            style={{ width: 80, height: 80, objectFit: "contain" }}
          />
        </View>
      )}
    </View>
  );
};
