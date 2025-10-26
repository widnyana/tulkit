import { StyleSheet } from "@react-pdf/renderer";

// Enhanced Granite Ledger template styles
// Granite-inspired color palette with improved visual hierarchy
export const graniteTemplateStyles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 10,
    backgroundColor: "#FFFFFF", // Clean white background
  },

  // Header section with strong granite theme
  header: {
    backgroundColor: "#3C4B58", // Deep granite gray
    padding: 16,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    marginBottom: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  logo: {
    width: 60,
    height: 60,
    objectFit: "contain",
    marginBottom: 6,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF", // White for contrast against granite
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  headerInvoiceNumber: {
    fontSize: 11,
    color: "#E2E8F0", // Light granite-200 equivalent
  },

  // Main content container
  container: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#D1D5DB", // Consistent granite border
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },

  // Two-column layout for details with improved spacing
  detailsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  leftColumn: {
    width: "48%", // Slightly less than 50% for better visual balance
    paddingRight: 12,
  },

  rightColumn: {
    width: "48%", // Slightly less than 50% for better visual balance
    paddingLeft: 12,
  },

  // Labels and values with improved typography
  label: {
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: 4,
    textTransform: "uppercase",
    color: "#6A7B88", // Medium granite color
    letterSpacing: 0.7,
  },

  value: {
    fontSize: 10,
    marginBottom: 4,
    lineHeight: 1.5,
    color: "#1F2937", // Dark charcoal for readability
  },

  contactValue: {
    fontSize: 10,
    marginBottom: 4,
    lineHeight: 1.5,
    color: "#1F2937", // Dark charcoal for readability
  },

  // Table styles with stronger ledger appearance
  table: {
    width: "100%",
    marginBottom: 20,
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#D1D5DB", // Consistent granite border
    borderRadius: 0, // Sharp corners for ledger feel
  },

  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB", // Consistent granite border
  },

  headerRow: {
    backgroundColor: "#3C4B58", // Deep granite for header
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB", // Consistent granite border
  },

  descriptionColHeader: {
    width: "50%",
    padding: 8,
    textAlign: "left" as "left",
    fontWeight: "bold",
    fontSize: 8,
    textTransform: "uppercase",
    color: "#FFFFFF", // White for contrast against granite
    letterSpacing: 0.7,
  },

  narrowColHeader: {
    width: "16.66%",
    padding: 8,
    textAlign: "center" as "center",
    fontWeight: "bold",
    fontSize: 8,
    textTransform: "uppercase",
    color: "#FFFFFF", // White for contrast against granite
    letterSpacing: 0.7,
  },

  descriptionCol: {
    width: "50%",
    padding: 8,
    textAlign: "left" as "left",
    fontSize: 10,
  },

  narrowCol: {
    width: "16.66%",
    padding: 8,
    textAlign: "center" as "center",
    fontSize: 10,
  },

  // Enhanced alternating row colors for table
  tableRowEven: {
    backgroundColor: "#F9FAFB", // Very light granite background
  },

  tableRowOdd: {
    backgroundColor: "#FFFFFF", // White background
  },

  // Notes and totals container with better balance
  notesAndTotalsContainer: {
    flexDirection: "row",
    marginTop: 20,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  notes: {
    padding: 16,
    backgroundColor: "#F9FAFB", // Very light granite background
    borderRadius: 0, // Sharp corners for ledger consistency
    width: "55%",
    marginRight: 16,
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#D1D5DB", // Consistent granite border
  },

  totals: {
    width: "45%",
    marginLeft: 16,
  },

  notesLabel: {
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: 8,
    textTransform: "uppercase",
    color: "#6A7B88", // Medium granite color
    letterSpacing: 0.7,
  },

  // Totals table with granite styling
  totalsTable: {
    width: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#D1D5DB", // Consistent granite border
    borderRadius: 0, // Sharp corners for ledger consistency
  },

  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB", // Consistent granite border
  },

  totalsLastRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 8,
    borderTopWidth: 2,
    borderTopColor: "#3C4B58", // Deep granite color for emphasis
    fontWeight: "bold",
    fontSize: 11,
  },

  // Accent color for totals
  accent: {
    color: "#3C4B58", // Deep granite color
  },

  totalsLabel: {
    fontWeight: "bold",
    color: "#1F2937", // Dark charcoal for readability
  },

  // Footer with granite styling
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: "center" as "center",
    fontSize: 8,
    color: "#6A7B88", // Medium granite color
    borderTopWidth: 1,
    borderTopColor: "#D1D5DB", // Consistent granite border
    paddingTop: 8,
  },

  // Spacing helpers
  mb4: { marginBottom: 4 },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  mb16: { marginBottom: 16 },
  mb20: { marginBottom: 20 },
  mt4: { marginTop: 4 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  mt20: { marginTop: 20 },
});
