import type { InvoiceData } from "@/lib/invoice/types";
import { Text, View } from "@react-pdf/renderer";
import type React from "react";
import { graniteTemplateStyles } from "../styles";

interface GraniteTemplateDetailsSectionProps {
  invoiceData: InvoiceData;
}

export const GraniteTemplateDetailsSection: React.FC<
  GraniteTemplateDetailsSectionProps
> = ({ invoiceData }) => {
  return (
    <View style={graniteTemplateStyles.detailsContainer}>
      {/* Left Column - Billing Info */}
      <View style={graniteTemplateStyles.leftColumn}>
        {/* Bill To */}
        <View style={graniteTemplateStyles.mb12}>
          <Text style={graniteTemplateStyles.label}>Bill To:</Text>
          <Text style={graniteTemplateStyles.value}>
            {invoiceData.recipient.name}
          </Text>
          <Text style={graniteTemplateStyles.contactValue}>
            {invoiceData.recipient.address}
          </Text>
          <Text style={graniteTemplateStyles.contactValue}>
            {invoiceData.recipient.email}
          </Text>
          <Text style={graniteTemplateStyles.contactValue}>
            {invoiceData.recipient.phone}
          </Text>
        </View>
      </View>

      {/* Right Column - Totals and Dates */}
      <View style={graniteTemplateStyles.rightColumn}>
        {/* From */}
        <View style={graniteTemplateStyles.mb12}>
          <Text style={graniteTemplateStyles.label}>From:</Text>
          <Text style={graniteTemplateStyles.value}>
            {invoiceData.sender.name}
          </Text>
          <Text style={graniteTemplateStyles.contactValue}>
            {invoiceData.sender.address}
          </Text>
          <Text style={graniteTemplateStyles.contactValue}>
            {invoiceData.sender.email}
          </Text>
          <Text style={graniteTemplateStyles.contactValue}>
            {invoiceData.sender.phone}
          </Text>
        </View>

        {/* Dates */}
        <View>
          <View style={graniteTemplateStyles.mb4}>
            <Text style={graniteTemplateStyles.label}>Issue Date:</Text>
            <Text style={graniteTemplateStyles.value}>
              {invoiceData.issueDate}
            </Text>
          </View>
          <View style={graniteTemplateStyles.mb4}>
            <Text style={graniteTemplateStyles.label}>Due Date:</Text>
            <Text style={graniteTemplateStyles.value}>
              {invoiceData.dueDate}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};
