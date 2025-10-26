import type { InvoiceData } from "@/lib/invoice/types";
import { Text, View } from "@react-pdf/renderer";
import { defaultTemplateStyles } from "../styles";

interface DetailsSectionProps {
  invoiceData: InvoiceData;
}

export const DefaultTemplateDetailsSection = ({
  invoiceData,
}: DetailsSectionProps) => {
  return (
    <View style={defaultTemplateStyles.detailsContainer}>
      <View style={defaultTemplateStyles.senderInfo}>
        <Text style={defaultTemplateStyles.label}>From</Text>
        <Text style={defaultTemplateStyles.value}>
          {invoiceData.sender.name || ""}
        </Text>
        <Text style={defaultTemplateStyles.value}>
          {invoiceData.sender.address || ""}
        </Text>
        <Text style={defaultTemplateStyles.value}>
          {invoiceData.sender.email || ""}
        </Text>
        <Text style={defaultTemplateStyles.value}>
          {invoiceData.sender.phone || ""}
        </Text>
      </View>
      <View style={defaultTemplateStyles.recipientInfo}>
        <Text
          style={[
            defaultTemplateStyles.label,
            defaultTemplateStyles.recipientInfoText,
          ]}
        >
          Bill To
        </Text>
        <Text
          style={[
            defaultTemplateStyles.value,
            defaultTemplateStyles.recipientInfoText,
          ]}
        >
          {invoiceData.recipient.name || ""}
        </Text>
        <Text
          style={[
            defaultTemplateStyles.value,
            defaultTemplateStyles.recipientInfoText,
          ]}
        >
          {invoiceData.recipient.address || ""}
        </Text>
        {/* Always render optional fields to avoid reconciliation bugs */}
        <Text
          style={[
            defaultTemplateStyles.contactValue,
            defaultTemplateStyles.recipientInfoText,
            { display: invoiceData.recipient.email ? "flex" : "none" },
          ]}
        >
          {invoiceData.recipient.email || ""}
        </Text>
        <Text
          style={[
            defaultTemplateStyles.contactValue,
            defaultTemplateStyles.recipientInfoText,
            { display: invoiceData.recipient.phone ? "flex" : "none" },
          ]}
        >
          {invoiceData.recipient.phone || ""}
        </Text>
        <Text
          style={[
            defaultTemplateStyles.label,
            defaultTemplateStyles.recipientInfoText,
            { marginTop: 10 },
          ]}
        >
          Invoice Details
        </Text>
        <Text
          style={[
            defaultTemplateStyles.value,
            defaultTemplateStyles.recipientInfoText,
          ]}
        >
          Date:{" "}
          {invoiceData.issueDate
            ? new Date(invoiceData.issueDate).toLocaleDateString()
            : ""}
        </Text>
        <Text
          style={[
            defaultTemplateStyles.value,
            defaultTemplateStyles.recipientInfoText,
          ]}
        >
          Due:{" "}
          {invoiceData.dueDate
            ? new Date(invoiceData.dueDate).toLocaleDateString()
            : ""}
        </Text>
      </View>
    </View>
  );
};
