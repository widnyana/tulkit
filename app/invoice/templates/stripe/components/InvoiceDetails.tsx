import type { InvoiceData } from "@/lib/invoice/types";
import { Text, View } from "@react-pdf/renderer";
import { stripeTemplateStyles as s } from "../styles";

interface InvoiceDetailsProps {
  invoiceData: InvoiceData;
}

export const StripeTemplateInvoiceDetails = ({
  invoiceData,
}: InvoiceDetailsProps) => {
  return (
    <View style={[s.row, s.mb20, { gap: 24 }]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.label, s.mb4]}>Invoice Number</Text>
        <Text style={[s.body, { fontWeight: 600 }]}>
          {invoiceData.invoiceNumber}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.label, s.mb4]}>Invoice Date</Text>
        <Text style={s.body}>
          {new Date(invoiceData.issueDate).toLocaleDateString()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.label, s.mb4]}>Due Date</Text>
        <Text style={s.body}>
          {new Date(invoiceData.dueDate).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
};
