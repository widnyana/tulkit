import { StyleSheet } from "@react-pdf/renderer";

/**
 * Apex invoice template - Warm & Energetic with Coral
 * Primary: Deep Charcoal #1F2937
 * Accent: Coral #FF6B6B
 * Warm Neutrals: #6B7280, #9CA3AF, #FFFBF5
 */
export const apexTemplateStyles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 40,
    fontFamily: "Helvetica",
  },

  // Accent bar
  accentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FF6B6B",
    height: 2,
  },

  // Typography
  h1: {
    fontSize: 32,
    fontWeight: 700,
    color: "#1F2937",
    letterSpacing: -1,
  },
  h2: {
    fontSize: 11,
    fontWeight: 600,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  label: {
    fontSize: 8,
    fontWeight: 500,
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  body: {
    fontSize: 10,
    color: "#1F2937",
    lineHeight: 1.6,
  },
  bodySmall: {
    fontSize: 9,
    color: "#6B7280",
    lineHeight: 1.5,
  },
  bodyBold: {
    fontSize: 10,
    color: "#1F2937",
    fontWeight: 600,
  },

  // Layout
  row: {
    flexDirection: "row",
  },
  spaceBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  column: {
    flexDirection: "column",
  },

  // Spacing
  mb2: { marginBottom: 2 },
  mb4: { marginBottom: 4 },
  mb6: { marginBottom: 6 },
  mb8: { marginBottom: 8 },
  mb10: { marginBottom: 10 },
  mb12: { marginBottom: 12 },
  mb16: { marginBottom: 16 },
  mb20: { marginBottom: 20 },
  mb24: { marginBottom: 24 },
  mb28: { marginBottom: 28 },
  mt4: { marginTop: 4 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  mt20: { marginTop: 20 },
  mt24: { marginTop: 24 },
  mr8: { marginRight: 8 },
  mr12: { marginRight: 12 },
  mr16: { marginRight: 16 },

  // Header section
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
    marginTop: 8,
  },

  // Two-column layout
  twoColumnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  leftColumn: {
    flex: 1,
    marginRight: 20,
  },
  rightColumn: {
    width: 240,
  },

  // Info boxes
  infoBox: {
    backgroundColor: "transparent",
    padding: 0,
  },

  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1F2937",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 0,
    borderBottomWidth: 2,
    borderBottomColor: "#FF6B6B",
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: 700,
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tableRowAlt: {
    backgroundColor: "#FFFFFF",
  },
  tableCell: {
    fontSize: 10,
    color: "#1F2937",
  },
  tableCellGray: {
    fontSize: 10,
    color: "#6B7280",
  },

  // Totals section
  totalsContainer: {
    backgroundColor: "transparent",
    padding: 0,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  totalLabel: {
    fontSize: 10,
    color: "#6B7280",
  },
  totalValue: {
    fontSize: 10,
    color: "#1F2937",
    fontWeight: 600,
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 2,
    borderTopColor: "#FF6B6B",
  },
  grandTotalLabel: {
    fontSize: 12,
    color: "#1F2937",
    fontWeight: 700,
  },
  grandTotalValue: {
    fontSize: 18,
    color: "#FF6B6B",
    fontWeight: 700,
  },

  // Payment information section
  paymentSection: {
    padding: 0,
  },
  paymentTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  paymentRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  paymentLabel: {
    fontSize: 9,
    fontWeight: 500,
    color: "#9CA3AF",
    width: 100,
  },
  paymentValue: {
    fontSize: 9,
    color: "#1F2937",
    flex: 1,
  },

  // Footer section (From/Sender)
  fromSection: {
    padding: 0,
    backgroundColor: "transparent",
  },
  fromTitle: {
    fontSize: 9,
    fontWeight: 600,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },

  // Footer page number
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#9CA3AF",
    textAlign: "center",
  },

  // Notes section
  notesSection: {
    padding: 0,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 9,
    color: "#1F2937",
    lineHeight: 1.5,
  },
});
