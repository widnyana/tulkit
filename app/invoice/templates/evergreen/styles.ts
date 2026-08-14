import { StyleSheet } from "@react-pdf/renderer";

/**
 * Evergreen invoice template - page-break-safe ledger
 * Primary: Evergreen Ink #123F3A
 * Accent: Teal #0F766E
 * Wash: Mint #E8F3EF
 * Emphasis: Amber #B45309 (Total Due)
 * Secondary: Sage #52645E
 *
 * Pagination contract:
 * - Item rows carry minPresenceAhead so a row never splits across pages.
 * - The totals/notes/payment cluster is wrap={false} so it moves as one unit.
 * - A fixed top band announces "INVOICE #N — CONTINUED" on pages >= 2.
 */
export const evergreenTemplateStyles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    paddingTop: 64, // clears the fixed continued band
    paddingBottom: 56, // clears the fixed footer
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: "#123F3A",
  },

  // Fixed elements
  continuedBand: {
    position: "absolute",
    top: 28,
    left: 48,
    right: 48,
    fontSize: 8,
    letterSpacing: 1.5,
    color: "#0F766E",
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#52645E",
  },

  // Header
  accentRule: {
    height: 3,
    backgroundColor: "#0F766E",
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 3,
    color: "#0F766E",
  },
  invoiceNumber: {
    fontSize: 11,
    color: "#52645E",
    marginTop: 4,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  // Logo sits on a mint plate with a teal hairline — same wash/hairline pair
  // as the table header, so the mark reads as part of the ledger language.
  logoPlate: {
    backgroundColor: "#E8F3EF",
    border: 0.5,
    borderColor: "#0F766E",
    borderRadius: 2,
    padding: 6,
    marginRight: 12,
  },
  logo: {
    maxWidth: 72,
    maxHeight: 36,
    objectFit: "contain",
  },
  brandName: {
    fontSize: 16,
    fontWeight: 700,
    color: "#123F3A",
  },
  brandContact: {
    fontSize: 8.5,
    color: "#52645E",
    marginTop: 2,
  },

  // Parties / dates
  partiesRow: {
    flexDirection: "row",
    marginTop: 18,
    marginBottom: 18,
  },
  partyCol: {
    width: "50%",
    paddingRight: 12,
  },
  partyColRight: {
    width: "50%",
    paddingLeft: 12,
    alignItems: "flex-end",
  },
  label: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.5,
    color: "#0F766E",
    marginBottom: 5,
  },
  partyName: {
    fontSize: 10.5,
    fontWeight: 700,
    marginBottom: 2,
  },
  partyDetail: {
    fontSize: 9,
    color: "#52645E",
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 9.5,
    marginBottom: 4,
  },

  // Items table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#E8F3EF",
    borderBottom: 1,
    borderBottomColor: "#0F766E",
    paddingBottom: 6,
    paddingTop: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: 0.5,
    borderBottomColor: "#DCE7E2",
    paddingTop: 6,
    paddingBottom: 6,
  },
  colDescription: { flex: 1, paddingRight: 8 },
  colDescriptionHeader: { flex: 1, paddingRight: 8 },
  colNarrow: { width: 50, textAlign: "right" },
  colNarrowHeader: { width: 50, textAlign: "right", fontWeight: 700 },
  colWide: { width: 80, textAlign: "right" },
  colWideHeader: { width: 80, textAlign: "right", fontWeight: 700 },
  itemNotes: {
    fontSize: 8,
    color: "#52645E",
    marginTop: 2,
  },

  // Totals / notes / payment cluster (wrap={false})
  bottomCluster: {
    flexDirection: "row",
    marginTop: 20,
  },
  notesCol: {
    width: "55%",
    paddingRight: 16,
  },
  totalsCol: {
    width: "45%",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
    paddingBottom: 4,
  },
  totalsLabel: {
    color: "#52645E",
  },
  totalsValue: {
    fontWeight: 700,
  },
  totalsDueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 8,
    borderTop: 1.5,
    borderTopColor: "#123F3A",
  },
  totalsDueLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
    color: "#B45309",
  },
  totalsDueValue: {
    fontSize: 13,
    fontWeight: 700,
    color: "#B45309",
  },
  notesText: {
    fontSize: 8.5,
    color: "#52645E",
  },
  paymentRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  paymentLabel: {
    width: 90,
    color: "#52645E",
  },
  paymentValue: {
    flex: 1,
  },
});
