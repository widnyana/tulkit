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
  // Calculate totals for each item
  const itemsWithTotals = invoiceData.items.map((item) => ({
    ...item,
    total: item.quantity * item.unitPrice,
  }));

  return (
    <View style={graniteTemplateStyles.table}>
      {/* Table Header */}
      <View
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
            {item.quantity.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}
          </Text>
          <Text style={graniteTemplateStyles.narrowCol}>
            {invoiceData.currency}
            {item.unitPrice.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <Text style={graniteTemplateStyles.narrowCol}>
            {invoiceData.currency}
            {item.total.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
      ))}
    </View>
  );
};
