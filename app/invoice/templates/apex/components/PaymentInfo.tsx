import type { InvoiceData } from "@/lib/invoice/types";
import { Image, Text, View } from "@react-pdf/renderer";
import { apexTemplateStyles as s } from "../styles";

interface PaymentInfoProps {
  invoiceData: InvoiceData;
}

export const ApexTemplatePaymentInfo = ({ invoiceData }: PaymentInfoProps) => {
  const paymentInfo = invoiceData.paymentInfo;

  // Don't render if no payment info provided
  if (!paymentInfo) {
    return null;
  }

  const hasAnyInfo =
    (paymentInfo.bankName && paymentInfo.bankName.trim() !== "") ||
    (paymentInfo.accountNumber && paymentInfo.accountNumber.trim() !== "") ||
    (paymentInfo.routingCode && paymentInfo.routingCode.trim() !== "") ||
    (paymentInfo.paymentMethods && paymentInfo.paymentMethods.length > 0) ||
    (paymentInfo.paymentQRCode && paymentInfo.paymentQRCode.trim() !== "");

  if (!hasAnyInfo) {
    return null;
  }

  return (
    <View style={s.paymentSection}>
      <Text style={s.paymentTitle}>Payment Information</Text>

      {/* Bank Details */}
      {paymentInfo.bankName && (
        <View style={s.paymentRow}>
          <Text style={s.paymentLabel}>Bank Name:</Text>
          <Text style={s.paymentValue}>{paymentInfo.bankName}</Text>
        </View>
      )}

      {paymentInfo.accountNumber && (
        <View style={s.paymentRow}>
          <Text style={s.paymentLabel}>Account Number:</Text>
          <Text style={s.paymentValue}>{paymentInfo.accountNumber}</Text>
        </View>
      )}

      {paymentInfo.routingCode && (
        <View style={s.paymentRow}>
          <Text style={s.paymentLabel}>Routing/SWIFT:</Text>
          <Text style={s.paymentValue}>{paymentInfo.routingCode}</Text>
        </View>
      )}

      {/* Payment Methods */}
      {paymentInfo.paymentMethods && paymentInfo.paymentMethods.length > 0 && (
        <View style={s.paymentRow}>
          <Text style={s.paymentLabel}>Accepted Methods:</Text>
          <Text style={s.paymentValue}>
            {paymentInfo.paymentMethods.join(", ")}
          </Text>
        </View>
      )}

      {/* QR Code */}
      {paymentInfo.paymentQRCode && (
        <View style={s.paymentRow}>
          <Text style={s.paymentLabel}>QR Code:</Text>
          <View style={{ flex: 1 }}>
            <Image
              src={paymentInfo.paymentQRCode}
              style={{
                width: 60,
                height: 60,
                objectFit: "contain",
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
};
