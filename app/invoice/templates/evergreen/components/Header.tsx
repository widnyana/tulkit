import type { InvoiceData } from "@/lib/invoice/types";
import { Text, View } from "@react-pdf/renderer";
import { evergreenTemplateStyles as s } from "../styles";

interface HeaderProps {
  invoiceData: InvoiceData;
}

export const EvergreenTemplateHeader = ({ invoiceData }: HeaderProps) => (
  <View>
    <View style={s.accentRule} />
    <View style={s.headerRow}>
      <View>
        <Text style={s.brandName}>{invoiceData.sender.name || ""}</Text>
        <Text style={s.brandContact}>{invoiceData.sender.address || ""}</Text>
        <Text style={s.brandContact}>{invoiceData.sender.email || ""}</Text>
        <Text style={s.brandContact}>{invoiceData.sender.phone || ""}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={s.eyebrow}>INVOICE</Text>
        <Text style={s.invoiceNumber}>#{invoiceData.invoiceNumber || ""}</Text>
      </View>
    </View>
  </View>
);

/**
 * Fixed band that announces continuation on pages >= 2. On page 1 the render
 * prop returns an empty string, so nothing shows.
 */
export const EvergreenContinuedBand = ({ invoiceData }: HeaderProps) => (
  <Text
    style={s.continuedBand}
    fixed
    render={({ pageNumber }) =>
      pageNumber > 1
        ? `INVOICE #${invoiceData.invoiceNumber || ""} — CONTINUED`
        : ""
    }
  />
);
