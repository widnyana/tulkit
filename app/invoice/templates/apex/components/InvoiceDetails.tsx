import type { InvoiceData } from "@/lib/invoice/types";
import { Text, View } from "@react-pdf/renderer";
import { apexTemplateStyles as s } from "../styles";

interface InvoiceDetailsProps {
  invoiceData: InvoiceData;
}

export const ApexTemplateInvoiceDetails = ({
  invoiceData,
}: InvoiceDetailsProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <View>
      {/* Issue Date */}
      <View style={[s.mb10, { alignItems: "flex-end" }]}>
        <Text style={[s.label, s.mb2]}>Issue Date</Text>
        <Text style={s.body}>{formatDate(invoiceData.issueDate)}</Text>
      </View>

      {/* Due Date */}
      <View style={[s.mb10, { alignItems: "flex-end" }]}>
        <Text style={[s.label, s.mb2]}>Due Date</Text>
        <Text style={s.body}>{formatDate(invoiceData.dueDate)}</Text>
      </View>

      {/* Invoice Number */}
      <View style={[s.mb10, { alignItems: "flex-end" }]}>
        <Text style={[s.label, s.mb2]}>Invoice Number</Text>
        <Text style={s.bodyBold}>#{invoiceData.invoiceNumber}</Text>
      </View>
    </View>
  );
};
