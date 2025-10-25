import { View, Text } from "@react-pdf/renderer";
import { InvoiceData } from "../../../../../../lib/types";
import { defaultTemplateStyles } from "../styles";

interface ItemsTableProps {
  invoiceData: InvoiceData;
}

export const DefaultTemplateItemsTable = ({ invoiceData }: ItemsTableProps) => {
  return (
    <View style={defaultTemplateStyles.table}>
      <View style={defaultTemplateStyles.tableRow}>
        <View style={defaultTemplateStyles.tableColHeader}>
          <Text>Description</Text>
        </View>
        <View style={defaultTemplateStyles.tableColHeader}>
          <Text>Quantity</Text>
        </View>
        <View style={defaultTemplateStyles.tableColHeader}>
          <Text>Unit Price</Text>
        </View>
        <View style={defaultTemplateStyles.tableColHeader}>
          <Text>Total</Text>
        </View>
      </View>
      {invoiceData.items.map((item, index) => (
        <View key={index}>
          <View style={defaultTemplateStyles.tableRow}>
            <View style={defaultTemplateStyles.tableCol}>
              <Text>{item.description}</Text>
            </View>
            <View style={defaultTemplateStyles.tableCol}>
              <Text>{item.quantity}</Text>
            </View>
            <View style={defaultTemplateStyles.tableCol}>
              <Text>${item.unitPrice.toFixed(2)}</Text>
            </View>
            <View style={defaultTemplateStyles.tableCol}>
              <Text>${(item.quantity * item.unitPrice).toFixed(2)}</Text>
            </View>
          </View>
          {item.notes && item.notes.trim() !== '' && (
            <View style={defaultTemplateStyles.tableRow}>
              <View style={[defaultTemplateStyles.tableCol, { width: "100%" }]}>
                <Text style={defaultTemplateStyles.notesLabel}>Notes: {item.notes}</Text>
              </View>
            </View>
          )}
        </View>
      ))}
    </View>
  );
};
