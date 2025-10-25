import { StyleSheet } from "@react-pdf/renderer";

/**
 * Stripe invoice template - Clean minimal design
 * Official Stripe colors: #635BFF (purple), #0A2540 (navy), #F6F9FC (light)
 */
export const stripeTemplateStyles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 40,
    fontFamily: "Helvetica",
  },

  // Header
  headerBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#635BFF",
    height: 3,
  },

  // Typography
  h1: {
    fontSize: 24,
    fontWeight: 700,
    color: "#0A2540",
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 8,
    fontWeight: 600,
    color: "#8898AA",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  body: {
    fontSize: 10,
    color: "#0A2540",
  },
  bodySmall: {
    fontSize: 9,
    color: "#425466",
    lineHeight: 1.4,
  },

  // Layout
  row: {
    flexDirection: "row",
  },
  spaceBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  // Spacing
  mb4: { marginBottom: 4 },
  mb6: { marginBottom: 6 },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  mb16: { marginBottom: 16 },
  mb20: { marginBottom: 20 },
  mb24: { marginBottom: 24 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  mt20: { marginTop: 20 },

  // Table
  tableHeader: {
    flexDirection: "row",
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E3E8EE",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
  },
  tableCell: {
    fontSize: 10,
    color: "#0A2540",
  },
  tableCellGray: {
    fontSize: 10,
    color: "#425466",
  },

  // Totals
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 10,
    color: "#425466",
  },
  totalValue: {
    fontSize: 10,
    color: "#0A2540",
    fontWeight: 500,
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: "#0A2540",
  },
  grandTotalLabel: {
    fontSize: 11,
    color: "#0A2540",
    fontWeight: 700,
  },
  grandTotalValue: {
    fontSize: 14,
    color: "#0A2540",
    fontWeight: 700,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#8898AA",
    textAlign: "center",
  },
});
