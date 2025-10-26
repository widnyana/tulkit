import type { InvoiceData } from "@/lib/invoice/types";
import { Text, View } from "@react-pdf/renderer";
import { stripeTemplateStyles as s } from "../styles";

type NotesProps = {
  invoiceData: InvoiceData;
};

/**
 * Notes section component for Stripe template
 */
const StripeTemplateNotes: React.FC<NotesProps> = ({ invoiceData }) => {
  const hasNotes = invoiceData.notes && invoiceData.notes.trim().length > 0;

  if (!hasNotes) {
    return null;
  }

  return (
    <View>
      <View style={{ maxWidth: "70%" }}>
        <Text style={[s.label, s.mb6]}>Notes</Text>
        <Text style={s.bodySmall}>{invoiceData.notes}</Text>
      </View>
    </View>
  );
};

export { StripeTemplateNotes };
