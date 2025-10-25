import { Text, View } from "@react-pdf/renderer";
import type { InvoiceData } from "../../../../../../../lib/types";
import { stripeTemplateStyles } from "../styles";

interface ItemsTableProps {
  invoiceData: InvoiceData;
}

export const StripeTemplateItemsTable = ({ invoiceData }: ItemsTableProps) => {
  return (
    <View style={stripeTemplateStyles.table}>
      <View style={stripeTemplateStyles.tableHeader}>
        <View style={stripeTemplateStyles.colDescription}>
          <Text
            style={[
              stripeTemplateStyles.fontSize10,
              stripeTemplateStyles.fontMedium,
              stripeTemplateStyles.textDark,
            ]}
          >
            Description
          </Text>
        </View>
        <View style={[stripeTemplateStyles.colQty]}>
          <Text
            style={[
              stripeTemplateStyles.fontSize10,
              stripeTemplateStyles.fontMedium,
              stripeTemplateStyles.textDark,
              { textAlign: "center" },
            ]}
          >
            Qty
          </Text>
        </View>
        <View
          style={[
            stripeTemplateStyles.colUnitPrice,
            { textAlign: "right" as "right" },
          ]}
        >
          <Text
            style={[
              stripeTemplateStyles.fontSize10,
              stripeTemplateStyles.fontMedium,
              stripeTemplateStyles.textDark,
            ]}
          >
            Unit Price
          </Text>
        </View>
        <View
          style={[
            stripeTemplateStyles.colAmount,
            { textAlign: "right" as "right" },
          ]}
        >
          <Text
            style={[
              stripeTemplateStyles.fontSize10,
              stripeTemplateStyles.fontMedium,
              stripeTemplateStyles.textDark,
            ]}
          >
            Amount
          </Text>
        </View>
      </View>
      {invoiceData.items.map((item, index) => (
        <View key={index}>
          <View style={stripeTemplateStyles.tableRow}>
            <View style={stripeTemplateStyles.colDescription}>
              <Text
                style={[
                  stripeTemplateStyles.fontSize10,
                  stripeTemplateStyles.textDark,
                ]}
              >
                {item.description}
              </Text>
            </View>
            <View
              style={[
                stripeTemplateStyles.colQty,
                { textAlign: "center" as "center" },
              ]}
            >
              <Text
                style={[
                  stripeTemplateStyles.fontSize10,
                  stripeTemplateStyles.textDark,
                ]}
              >
                {item.quantity}
              </Text>
            </View>
            <View
              style={[
                stripeTemplateStyles.colUnitPrice,
                { textAlign: "right" as "right" },
              ]}
            >
              <Text
                style={[
                  stripeTemplateStyles.fontSize10,
                  stripeTemplateStyles.textDark,
                ]}
              >
                ${item.unitPrice.toFixed(2)}
              </Text>
            </View>
            <View
              style={[
                stripeTemplateStyles.colAmount,
                { textAlign: "right" as "right" },
              ]}
            >
              <Text
                style={[
                  stripeTemplateStyles.fontSize10,
                  stripeTemplateStyles.textDark,
                ]}
              >
                ${(item.quantity * item.unitPrice).toFixed(2)}
              </Text>
            </View>
          </View>
          {item.notes && item.notes.trim() !== "" && (
            <View style={stripeTemplateStyles.tableRow}>
              <View
                style={[
                  stripeTemplateStyles.colDescription,
                  { paddingLeft: 5 },
                ]}
              >
                <Text style={stripeTemplateStyles.notesLabel}>
                  Notes: {item.notes}
                </Text>
              </View>
            </View>
          )}
        </View>
      ))}
    </View>
  );
};
