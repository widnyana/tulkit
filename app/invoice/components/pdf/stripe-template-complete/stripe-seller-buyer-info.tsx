import { Text, View } from "@react-pdf/renderer/lib/react-pdf.browser";
import type { InvoiceData } from "@/app/invoice/schema";
import type { STRIPE_TEMPLATE_STYLES } from ".";

export function StripeSellerBuyerInfo({
  invoiceData,
  styles,
}: {
  invoiceData: InvoiceData;
  styles: typeof STRIPE_TEMPLATE_STYLES;
}) {
  const language = invoiceData.language;

  return (
    <View
      style={{
        flexDirection: "row",
        marginBottom: 24,
      }}
    >
      {/* Seller info */}
      <View style={{ marginRight: 70, width: "160px" }}>
        <Text style={[styles.fontSize10, styles.fontBold, styles.mb3]}>
          {invoiceData.seller.name}
        </Text>
        <Text style={[styles.fontSize9, styles.mb3]}>
          {invoiceData.seller.address}
        </Text>
        <Text style={[styles.fontSize9, styles.mb3]}>
          {invoiceData.seller.email}
        </Text>
        {invoiceData.seller.vatNoFieldIsVisible && (
          <Text style={[styles.fontSize9, styles.mb3]}>
            VAT No: {invoiceData.seller.vatNo}
          </Text>
        )}
        {invoiceData.seller.accountNumberFieldIsVisible && (
          <Text style={[styles.fontSize9, styles.mb3]}>
            Account Number: {invoiceData.seller.accountNumber}
          </Text>
        )}
        {invoiceData.seller.swiftBicFieldIsVisible && (
          <Text style={[styles.fontSize9, styles.mb3]}>
            SWIFT/BIC: {invoiceData.seller.swiftBic}
          </Text>
        )}

        {invoiceData.seller.notesFieldIsVisible && (
          <Text style={[styles.fontSize9, styles.mb3]}>
            {invoiceData.seller.notes}
          </Text>
        )}
      </View>

      {/* Buyer info */}
      <View style={{ width: "160px" }}>
        <Text style={[styles.fontSize10, styles.fontBold, styles.mb3]}>
          Bill To
        </Text>
        <Text style={[styles.fontSize9, styles.mb3]}>
          {invoiceData.buyer.name}
        </Text>
        <Text style={[styles.fontSize9, styles.mb3]}>
          {invoiceData.buyer.address}
        </Text>
        <Text style={[styles.fontSize9, styles.mb3]}>
          {invoiceData.buyer.email}
        </Text>

        {invoiceData.buyer.vatNoFieldIsVisible && (
          <Text style={[styles.fontSize9, styles.mb3]}>
            VAT No: {invoiceData.buyer.vatNo}
          </Text>
        )}

        {invoiceData.buyer.notesFieldIsVisible && (
          <Text style={[styles.fontSize9, styles.mb3]}>
            {invoiceData.buyer.notes}
          </Text>
        )}
      </View>
    </View>
  );
}
