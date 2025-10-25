import { Text, View, Link } from "@react-pdf/renderer/lib/react-pdf.browser";
import { type InvoiceData } from "@/app/invoice/schema";
import dayjs from "dayjs";
import "dayjs/locale/en";
import "dayjs/locale/pl";
import "dayjs/locale/de";
import "dayjs/locale/es";
import "dayjs/locale/pt";
import "dayjs/locale/ru";
import "dayjs/locale/uk";
import "dayjs/locale/fr";
import "dayjs/locale/it";
import "dayjs/locale/nl";
import type { STRIPE_TEMPLATE_STYLES } from ".";

export function StripeDueAmount({
  invoiceData,
  formattedInvoiceTotal,
  styles,
}: {
  invoiceData: InvoiceData;
  formattedInvoiceTotal: string;
  styles: typeof STRIPE_TEMPLATE_STYLES;
}) {
  const language = invoiceData.language;

  // Set dayjs locale based on invoice language
  dayjs.locale(language);

  const paymentDueDate = dayjs(invoiceData.paymentDue).format(
    invoiceData.dateFormat,
  );

  // Check if payOnlineUrl is provided and valid
  const hasPayOnlineUrl = invoiceData.stripePayOnlineUrl;

  return (
    <View>
      <Text style={[styles.fontSize14, styles.fontBold, styles.mb8]}>
        {formattedInvoiceTotal} due {paymentDueDate}
      </Text>
      {hasPayOnlineUrl ? (
        <Link
          href={invoiceData.stripePayOnlineUrl}
          style={[
            styles.fontSize10,
            styles.fontBold,
            { color: "#635BFF", textDecoration: "underline" },
          ]}
        >
          Pay Online
        </Link>
      ) : null}
    </View>
  );
}
