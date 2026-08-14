import type { InvoiceData } from "@/lib/invoice/types";
import { Text, View } from "@react-pdf/renderer";
import { evergreenTemplateStyles as s } from "../styles";

interface PartiesRowProps {
  invoiceData: InvoiceData;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
};

export const EvergreenTemplatePartiesRow = ({
  invoiceData,
}: PartiesRowProps) => (
  <View style={s.partiesRow}>
    <View style={s.partyCol}>
      <Text style={s.label}>BILLED TO</Text>
      <Text style={s.partyName}>{invoiceData.recipient.name || ""}</Text>
      <Text style={s.partyDetail}>{invoiceData.recipient.address || ""}</Text>
      {/* Always render optional fields to avoid reconciliation bugs */}
      <Text
        style={[
          s.partyDetail,
          { display: invoiceData.recipient.email ? "flex" : "none" },
        ]}
      >
        {invoiceData.recipient.email || ""}
      </Text>
      <Text
        style={[
          s.partyDetail,
          { display: invoiceData.recipient.phone ? "flex" : "none" },
        ]}
      >
        {invoiceData.recipient.phone || ""}
      </Text>
    </View>
    <View style={s.partyColRight}>
      <Text style={s.label}>ISSUE DATE</Text>
      <Text style={s.dateValue}>{formatDate(invoiceData.issueDate)}</Text>
      <Text style={s.label}>DUE DATE</Text>
      <Text style={s.dateValue}>{formatDate(invoiceData.dueDate)}</Text>
    </View>
  </View>
);
