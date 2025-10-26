import { Text, View } from "@react-pdf/renderer/lib/react-pdf.browser";
import type { InvoiceData } from "@/app/invoice/schema";
import type { STRIPE_TEMPLATE_STYLES } from ".";
import dayjs from "dayjs";
import { formatCurrency } from "@/app/invoice/utils/format-currency";

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

export function StripeItemsTable({
  invoiceData,
  styles,
}: {
  invoiceData: InvoiceData;
  styles: typeof STRIPE_TEMPLATE_STYLES;
}) {
  const language = invoiceData.language;
  const t = TRANSLATIONS[language];

  // Set dayjs locale based on invoice language
  dayjs.locale(language);

  // Check if any items have numeric VAT values (not "NP" or "OO")
  const hasNumericVat = invoiceData.items.some(
    (item) => typeof item.vat === "number",
  );

  // Calculate service period (example: Jan 01 2025 - Jan 31 2025)
  const servicePeriodStart = dayjs(invoiceData.dateOfService)
    .startOf("month")
    .format(invoiceData.dateFormat);

  const servicePeriodEnd = dayjs(invoiceData.dateOfService).format(
    invoiceData.dateFormat,
  );

  const vatAmountFieldIsVisible = invoiceData.items[0].vatFieldIsVisible;

  const canShowVat = vatAmountFieldIsVisible && hasNumericVat;

  return (
    <View style={[styles.table, styles.mt24]}>
      {/* Table header */}
      <View style={styles.tableHeader}>
        <View style={styles.colDescription}>
          <Text style={[styles.fontSize8]}>{t.stripe.description}</Text>
        </View>
        <View style={styles.colQty}>
          <Text style={[styles.fontSize8]}>{t.stripe.qty}</Text>
        </View>
        <View style={styles.colUnitPrice}>
          <Text style={[styles.fontSize8]}>{t.stripe.unitPrice}</Text>
        </View>
        {canShowVat ? (
          <View style={styles.colTax}>
            <Text style={[styles.fontSize8]}>{t.stripe.tax}</Text>
          </View>
        ) : null}
        <View style={styles.colAmount}>
          <Text style={[styles.fontSize8]}>{t.stripe.amount}</Text>
        </View>
      </View>

      {/* Table rows */}
      {invoiceData.items.map((item, index) => {
        const formattedNetPrice = formatCurrency({
          amount: item.netPrice,
          currency: invoiceData.currency,
          language,
        });

        const formattedPreTaxAmount = formatCurrency({
          amount: item.netAmount,
          currency: invoiceData.currency,
          language,
        });

        const formattedAmount = item.amount.toLocaleString("en-US", {
          style: "decimal",
          maximumFractionDigits: 0,
        });

        // Format VAT value
        const formattedVat =
          typeof item.vat === "number" ? `${item.vat}%` : item.vat;

        return (
          <View style={styles.tableRow} key={index}>
            <View style={styles.colDescription}>
              <Text style={[styles.fontSize10]}>{item.name}</Text>
              {/* Add service period if available */}
              <Text style={[styles.fontSize9, styles.mt4]}>
                {servicePeriodStart} – {servicePeriodEnd}
              </Text>
            </View>
            <View style={styles.colQty}>
              <Text style={[styles.fontSize11, styles.textDark]}>
                {formattedAmount}
              </Text>
            </View>
            <View style={styles.colUnitPrice}>
              <Text style={[styles.fontSize11, styles.textDark]}>
                {formattedNetPrice}
              </Text>
            </View>
            {canShowVat ? (
              <View style={styles.colTax}>
                <Text style={[styles.fontSize11, styles.textDark]}>
                  {typeof item.vat === "number" ? formattedVat : ""}
                </Text>
              </View>
            ) : null}
            <View style={styles.colAmount}>
              <Text style={[styles.fontSize11, styles.textDark]}>
                {formattedPreTaxAmount}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
