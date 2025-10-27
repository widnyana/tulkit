import type { InvoiceData } from "@/lib/invoice/types";
import { Image, Text, View } from "@react-pdf/renderer";
import { stripeTemplateStyles as s } from "../styles";

type PaymentInfoProps = {
  invoiceData: InvoiceData;
};

/**
 * Payment information component for Stripe template
 * Minimal design with no backgrounds or borders
 */
const StripeTemplatePaymentInfo: React.FC<PaymentInfoProps> = ({
  invoiceData,
}) => {
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
      <Text style={[s.label, s.mb12]}>Payment Information</Text>

      {/* Bank Details */}
      {paymentInfo.bankName && (
        <View style={s.paymentRow}>
          <Text style={s.paymentLabel}>Bank Name</Text>
          <Text style={s.body}>{paymentInfo.bankName}</Text>
        </View>
      )}

      {paymentInfo.accountNumber && (
        <View style={s.paymentRow}>
          <Text style={s.paymentLabel}>Account Number</Text>
          <Text style={s.body}>{paymentInfo.accountNumber}</Text>
        </View>
      )}

      {paymentInfo.routingCode && (
        <View style={s.paymentRow}>
          <Text style={s.paymentLabel}>Routing/SWIFT</Text>
          <Text style={s.body}>{paymentInfo.routingCode}</Text>
        </View>
      )}

      {/* Payment Methods */}
      {paymentInfo.paymentMethods && paymentInfo.paymentMethods.length > 0 && (
        <View style={s.paymentRow}>
          <Text style={s.paymentLabel}>Accepted Methods</Text>
          <Text style={s.body}>{paymentInfo.paymentMethods.join(", ")}</Text>
        </View>
      )}

      {/* QR Code */}
      {paymentInfo.paymentQRCode && (
        <View style={[s.paymentRow, s.mt12]}>
          <Text style={s.paymentLabel}>Payment QR Code</Text>
          <View style={{ flex: 1 }}>
            <Image
              src={paymentInfo.paymentQRCode}
              style={{
                width: 80,
                height: 80,
                objectFit: "contain",
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
};

export { StripeTemplatePaymentInfo };
