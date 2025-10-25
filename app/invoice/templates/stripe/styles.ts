import { StyleSheet } from "@react-pdf/renderer";

/**
 * Stripe-inspired invoice template styles
 * Design system: Clean, modern, professional
 * Brand color: Amber/yellow accent (#fbbf24)
 */
export const stripeTemplateStyles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 0,
    fontFamily: "Helvetica",
    fontWeight: 400,
  },
  headerBar: {
    backgroundColor: "#fbbf24", // Stripe-inspired yellow accent
    height: 5,
    width: "100%",
  },
  content: {
    paddingLeft: 40,
    paddingRight: 40,
    paddingTop: 32,
    paddingBottom: 40,
  },
  sectionSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    marginVertical: 20,
  },
  spacer: {
    height: 10,
  },
  fontSize8: { fontSize: 8 },
  fontSize9: { fontSize: 9 },
  fontSize10: { fontSize: 10 },
  fontSize11: { fontSize: 11 },
  fontSize12: { fontSize: 12 },
  fontSize14: { fontSize: 14 },
  fontSize16: { fontSize: 16 },
  fontSize18: { fontSize: 18 },
  fontSize24: { fontSize: 24 },
  fontRegular: {
    fontFamily: "Helvetica",
    fontWeight: 400,
  },
  fontMedium: {
    fontFamily: "Helvetica",
    fontWeight: 500,
  },
  fontBold: {
    fontFamily: "Helvetica",
    fontWeight: 600,
  },
  textGray: { color: "#6b7280" },
  textDark: { color: "#111827" },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  spaceBetween: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mb1: { marginBottom: 1 },
  mb2: { marginBottom: 2 },
  mb3: { marginBottom: 3 },
  mb4: { marginBottom: 4 },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  mb16: { marginBottom: 16 },
  mb20: { marginBottom: 20 },
  mb24: { marginBottom: 24 },
  mt2: { marginTop: 2 },
  mt4: { marginTop: 4 },
  mt8: { marginTop: 8 },
  mt16: { marginTop: 16 },
  mt24: { marginTop: 24 },
  table: {
    display: "flex",
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: "#111827",
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
  },
  descriptionCol: { flex: 3 },
  narrowCol: { flex: 0.8, textAlign: "center" as "center" },
  itemNotesContainer: {
    paddingLeft: 5,
    paddingRight: 5,
    paddingTop: 2,
    paddingBottom: 4,
  },
  itemNotesLabel: {
    fontSize: 8,
    fontStyle: "italic",
    color: "#6b7280",
  },
  dueAmountBox: {
    backgroundColor: "#fffbeb", // Soft yellow background
    padding: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#fbbf24", // Matching accent color
    marginTop: 16,
    marginBottom: 16,
  },
  totalsSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  finalTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  borderTop: {
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
  },
});
