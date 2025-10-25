import { View, Text } from "@react-pdf/renderer";
import { InvoiceData } from "../../../../../../lib/types";
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
          {invoiceData.sender.name}
        </Text>
        <Text style={defaultTemplateStyles.value}>
          {invoiceData.sender.address}
        </Text>
        <Text style={defaultTemplateStyles.value}>
          {invoiceData.sender.email}
        </Text>
        <Text style={defaultTemplateStyles.value}>
          {invoiceData.sender.phone}
        </Text>
      </View>
      <View style={defaultTemplateStyles.recipientInfo}>
        <Text style={defaultTemplateStyles.label}>Bill To</Text>
        <Text style={defaultTemplateStyles.value}>
          {invoiceData.recipient.name}
        </Text>
        <Text style={defaultTemplateStyles.value}>
          {invoiceData.recipient.address}
        </Text>
        <Text style={{ ...defaultTemplateStyles.value, marginTop: 10 }}>
          Invoice Date: {new Date(invoiceData.issueDate).toLocaleDateString()}
        </Text>
        <Text style={defaultTemplateStyles.value}>
          Due Date: {new Date(invoiceData.dueDate).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
};
