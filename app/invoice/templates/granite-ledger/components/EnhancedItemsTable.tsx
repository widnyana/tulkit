import type { InvoiceData } from "@/lib/invoice/types";
import { Text, View } from "@react-pdf/renderer";
import type React from "react";
import { graniteTemplateStyles } from "../new-styles";

interface GraniteTemplateItemsTableProps {
  invoiceData: InvoiceData;
}

export const EnhancedGraniteTemplateItemsTable: React.FC<GraniteTemplateItemsTableProps> = ({
  invoiceData,
}) => {
  // Calculate totals for each item
  const itemsWithTotals = invoiceData.items.map((item) => ({
    ...item,
    total: item.quantity * item.unitPrice,
  }));

  // Function to render cell with proper borders
  const renderCellWithBorder = (content: string | number, width: string, isLast = false) => (
    <View
      style={[
        graniteTemplateStyles.narrowCol,
        !isLast && { borderRightWidth: 1, borderRightColor: "#E5E7EB" }
      ]}
    >
      <Text>{content}</Text>
    </View>
  );

  return (
    <View style={graniteTemplateStyles.table}>
      {/* Table Header */}
      <View style={[graniteTemplateStyles.tableRow, graniteTemplateStyles.headerRow]}>
        <View style={[
          graniteTemplateStyles.descriptionColHeader,
          { borderRightWidth: 1, borderRightColor: "#E5E7EB" }
        ]}>
          <Text>Description</Text>
        </View>
        <View style={[
          graniteTemplateStyles.narrowColHeader,
          { borderRightWidth: 1, borderRightColor: "#E5E7EB" }
        ]}>
          <Text>Quantity</Text>
        </View>
        <View style={[
          graniteTemplateStyles.narrowColHeader,
          { borderRightWidth: 1, borderRightColor: "#E5E7EB" }
        ]}>
          <Text>Unit Price</Text>
        </View>
        <View style={graniteTemplateStyles.narrowColHeader}>
          <Text>Total</Text>
        </View>
      </View>

      {/* Table Rows */}
      {itemsWithTotals.map((item, index) => (
        <View 
          key={item.id} 
          style={[
            graniteTemplateStyles.tableRow,
            index % 2 === 0 
              ? graniteTemplateStyles.tableRowEven 
              : graniteTemplateStyles.tableRowOdd
          ]}
        >
          <View style={[
            graniteTemplateStyles.descriptionCol,
            { borderRightWidth: 1, borderRightColor: "#E5E7EB" }
          ]}>
            <Text>{item.description}</Text>
            {item.notes && (
              <View style={graniteTemplateStyles.mt4}>
                <Text style={graniteTemplateStyles.value}>{item.notes}</Text>
              </View>
            )}
          </View>
          <View style={[
            graniteTemplateStyles.narrowCol,
            { borderRightWidth: 1, borderRightColor: "#E5E7EB" }
          ]}>
            <Text>
              {item.quantity.toLocaleString(undefined, { 
                minimumFractionDigits: 0, 
                maximumFractionDigits: 2 
              })}
            </Text>
          </View>
          <View style={[
            graniteTemplateStyles.narrowCol,
            { borderRightWidth: 1, borderRightColor: "#E5E7EB" }
          ]}>
            <Text>
              {invoiceData.currency}{item.unitPrice.toLocaleString(undefined, { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
            </Text>
          </View>
          <View style={graniteTemplateStyles.narrowCol}>
            <Text>
              {invoiceData.currency}{item.total.toLocaleString(undefined, { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};