import type { InvoiceData } from "@/lib/invoice/types";
import { Image, Text, View } from "@react-pdf/renderer";
import { evergreenTemplateStyles as s } from "../styles";

interface PaymentInfoProps {
  invoiceData: InvoiceData;
}

export const EvergreenTemplatePaymentInfo = ({
  invoiceData,
}: PaymentInfoProps) => {
  const paymentInfo = invoiceData.paymentInfo;

  if (!paymentInfo) return null;

  const hasAnyInfo =
    (paymentInfo.bankName && paymentInfo.bankName.trim() !== "") ||
    (paymentInfo.accountNumber && paymentInfo.accountNumber.trim() !== "") ||
    (paymentInfo.routingCode && paymentInfo.routingCode.trim() !== "") ||
    (paymentInfo.paymentMethods && paymentInfo.paymentMethods.length > 0) ||
    (paymentInfo.paymentQRCode && paymentInfo.paymentQRCode.trim() !== "");

  if (!hasAnyInfo) return null;

  return (
    <View style={{ marginTop: 10 }}>
      <Text style={s.label}>PAYMENT</Text>
      {paymentInfo.bankName ? (
        <View style={s.paymentRow}>
          <Text style={s.paymentLabel}>Bank</Text>
          <Text style={s.paymentValue}>{paymentInfo.bankName}</Text>
        </View>
      ) : null}
      {paymentInfo.accountNumber ? (
        <View style={s.paymentRow}>
          <Text style={s.paymentLabel}>Account</Text>
          <Text style={s.paymentValue}>{paymentInfo.accountNumber}</Text>
        </View>
      ) : null}
      {paymentInfo.routingCode ? (
        <View style={s.paymentRow}>
          <Text style={s.paymentLabel}>Routing/SWIFT</Text>
          <Text style={s.paymentValue}>{paymentInfo.routingCode}</Text>
        </View>
      ) : null}
      {paymentInfo.paymentMethods && paymentInfo.paymentMethods.length > 0 ? (
        <View style={s.paymentRow}>
          <Text style={s.paymentLabel}>Methods</Text>
          <Text style={s.paymentValue}>
            {paymentInfo.paymentMethods.join(", ")}
          </Text>
        </View>
      ) : null}
      {paymentInfo.paymentQRCode ? (
        <View style={{ marginTop: 6 }}>
          <Image
            src={paymentInfo.paymentQRCode}
            style={{ width: 60, height: 60, objectFit: "contain" }}
          />
        </View>
      ) : null}
    </View>
  );
};
