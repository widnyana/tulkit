import type { InvoiceData } from "@/lib/invoice/types";
import { Text, View } from "@react-pdf/renderer";
import { apexTemplateStyles as s } from "../styles";

interface NotesProps {
  invoiceData: InvoiceData;
}

export const ApexTemplateNotes = ({ invoiceData }: NotesProps) => {
  if (!invoiceData.notes) return null;

  return (
    <View style={s.notesSection}>
      <Text style={s.notesTitle}>Notes / Terms</Text>
      <Text style={s.notesText}>{invoiceData.notes}</Text>
    </View>
  );
};
