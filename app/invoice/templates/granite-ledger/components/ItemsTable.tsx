import { formatCurrency } from "@/lib/invoice/formatCurrency";
import { formatNumber } from "@/lib/invoice/formatNumber";
import type { InvoiceData } from "@/lib/invoice/types";
import { Text, View } from "@react-pdf/renderer";
import type React from "react";
import { graniteTemplateStyles } from "../styles";

interface GraniteTemplateItemsTableProps {
  invoiceData: InvoiceData;
}

export const GraniteTemplateItemsTable: React.FC<
  GraniteTemplateItemsTableProps
> = ({ invoiceData }) => {
  const currency = invoiceData.currency || "$";
  const decimalSep = invoiceData.decimalSeparator || ",";
  const thousandSep = invoiceData.thousandSeparator || ".";

  // Calculate totals for each item
  const itemsWithTotals = invoiceData.items.map((item) => ({
    ...item,
    total: item.quantity * item.unitPrice,
  }));

  return (
    <View style={graniteTemplateStyles.table}>
      {/* Table Header */}
      <View
        fixed
        style={[
          graniteTemplateStyles.tableRow,
          graniteTemplateStyles.headerRow,
        ]}
      >
        <Text style={graniteTemplateStyles.descriptionColHeader}>
          Description
        </Text>
        <Text style={graniteTemplateStyles.narrowColHeader}>Quantity</Text>
        <Text style={graniteTemplateStyles.narrowColHeader}>Unit Price</Text>
        <Text style={graniteTemplateStyles.narrowColHeader}>Total</Text>
      </View>

      {/* Table Rows */}
      {itemsWithTotals.map((item, index) => (
        <View
          key={item.id}
          wrap={Boolean(item.notes)}
          style={[
            graniteTemplateStyles.tableRow,
            index % 2 === 0
              ? graniteTemplateStyles.tableRowEven
              : graniteTemplateStyles.tableRowOdd,
          ]}
        >
          <View style={graniteTemplateStyles.descriptionCol}>
            <Text style={graniteTemplateStyles.value}>{item.description}</Text>
            {item.notes && (
              <View style={graniteTemplateStyles.mt4}>
                <Text style={graniteTemplateStyles.contactValue}>
                  {item.notes}
                </Text>
              </View>
            )}
          </View>
          <Text style={graniteTemplateStyles.narrowCol}>
            {formatNumber(
              item.quantity,
              Number.isInteger(item.quantity) ? 0 : 2,
              decimalSep,
              thousandSep,
            )}
          </Text>
          <Text style={graniteTemplateStyles.narrowCol}>
            {formatCurrency(item.unitPrice, currency, decimalSep, thousandSep)}
          </Text>
          <Text style={graniteTemplateStyles.narrowCol}>
            {formatCurrency(item.total, currency, decimalSep, thousandSep)}
          </Text>
        </View>
      ))}
    </View>
  );
};
