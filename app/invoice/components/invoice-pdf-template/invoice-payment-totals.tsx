import { View, Text } from "@react-pdf/renderer/lib/react-pdf.browser";
import type { InvoiceData } from "@/app/invoice/schema";

import { TRANSLATIONS } from "@/app/invoice/translations";
import {
  getAmountInWords,
  getNumberFractionalPart,
} from "@/app/invoice/utils/invoice.utils";
import type { PDF_DEFAULT_TEMPLATE_STYLES } from ".";

export function InvoicePaymentTotals({
  invoiceData,
  formattedInvoiceTotal,
  styles,
}: {
  invoiceData: InvoiceData;
  formattedInvoiceTotal: string;
  styles: typeof PDF_DEFAULT_TEMPLATE_STYLES;
}) {
  const language = invoiceData.language;
  const t = TRANSLATIONS[language];

  const invoiceTotalInWords = getAmountInWords({
    amount: invoiceData?.total ?? 0,
    language,
  });

  const fractionalPart = getNumberFractionalPart(invoiceData?.total ?? 0);

  const currency = invoiceData.currency;

  return (
    <View style={{ maxWidth: "55%" }}>
      <View style={{ width: "auto", alignSelf: "flex-start", marginTop: 0 }}>
        <Text
          style={[
            styles.subheader,
            {
              borderBottom: "1px solid black",
            },
            styles.fontSize11,
            styles.fontBold,
          ]}
        >
          {t.paymentTotals.toPay}: {formattedInvoiceTotal} {currency}
        </Text>
      </View>

      <Text style={styles.fontSize7}>
        {t.paymentTotals.paid}:{" "}
        <Text style={[styles.boldText, styles.fontSize8]}>0.00 {currency}</Text>
      </Text>

      <Text style={[styles.boldText, styles.fontSize7]}>
        {t.paymentTotals.leftToPay}:{" "}
        <Text style={[styles.boldText, styles.fontSize8]}>
          {formattedInvoiceTotal} {currency}
        </Text>
      </Text>

      <Text style={styles.fontSize7}>
        {t.paymentTotals.amountInWords}:{" "}
        <Text style={[styles.boldText, styles.fontSize8]}>
          {invoiceTotalInWords} {currency} {fractionalPart}/100
        </Text>
      </Text>
    </View>
  );
}
