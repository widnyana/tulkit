import { StyleSheet } from "@react-pdf/renderer";

// Improved Granite Ledger template styles
export const graniteTemplateStyles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 10,
    backgroundColor: "#FFFFFF",
  },

  // Enhanced header with better typography and visual weight (modernized - no border radius)
  header: {
    backgroundColor: "#2C3E50", // Deeper granite blue-gray
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },

  logo: {
    width: 70,
    height: 70,
    objectFit: "contain",
    marginBottom: 8,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontFamily: "Helvetica-Bold",
  },

  headerInvoiceNumber: {
    fontSize: 12,
    color: "#BDC3C7", // Lighter granite tone
    marginTop: 4,
    fontFamily: "Helvetica",
  },

  // Enhanced main content container (modernized - no border)
  container: {
    backgroundColor: "#FFFFFF",
    paddingTop: 20, // Reduced from 24 to account for header spacing
    paddingBottom: 24,
    paddingHorizontal: 24,
  },

  // Improved details container with better spacing (modernized - using padding instead of border)
  detailsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
    paddingBottom: 20,
  },

  leftColumn: {
    width: "48%",
    paddingRight: 16,
  },

  rightColumn: {
    width: "48%",
    paddingLeft: 16,
  },

  // Enhanced typography for labels and values
  label: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 6,
    textTransform: "uppercase",
    color: "#7F8C8D", // Medium granite color
    letterSpacing: 0.8,
    fontFamily: "Helvetica-Bold",
  },

  value: {
    fontSize: 11,
    marginBottom: 5,
    lineHeight: 1.5,
    color: "#2C3E50", // Dark granite for readability
    fontFamily: "Helvetica",
  },

  contactValue: {
    fontSize: 10,
    marginBottom: 4,
    lineHeight: 1.4,
    color: "#2C3E50",
    fontFamily: "Helvetica",
  },

  // Enhanced table with better spacing and visual hierarchy (modernized - no border)
  table: {
    width: "100%",
    marginBottom: 24,
    borderRadius: 4,
    overflow: "hidden",
  },

  tableRow: {
    flexDirection: "row",
  },

  headerRow: {
    backgroundColor: "#2C3E50",
  },

  descriptionColHeader: {
    width: "50%",
    padding: 12,
    textAlign: "left" as "left",
    fontWeight: "bold",
    fontSize: 9,
    textTransform: "uppercase",
    color: "#FFFFFF",
    letterSpacing: 0.8,
    fontFamily: "Helvetica-Bold",
  },

  narrowColHeader: {
    width: "16.66%",
    padding: 12,
    textAlign: "center" as "center",
    fontWeight: "bold",
    fontSize: 9,
    textTransform: "uppercase",
    color: "#FFFFFF",
    letterSpacing: 0.8,
    fontFamily: "Helvetica-Bold",
  },

  descriptionCol: {
    width: "50%",
    padding: 12,
    textAlign: "left" as "left",
    fontSize: 10,
    fontFamily: "Helvetica",
  },

  narrowCol: {
    width: "16.66%",
    padding: 12,
    textAlign: "center" as "center",
    fontSize: 10,
    fontFamily: "Helvetica",
  },

  // Improved alternating row colors for better readability
  tableRowEven: {
    backgroundColor: "#F8F9FA",
  },

  tableRowOdd: {
    backgroundColor: "#FFFFFF",
  },

  // Enhanced notes and totals container with better balance
  notesAndTotalsContainer: {
    flexDirection: "row",
    marginTop: 24,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  notes: {
    padding: 20,
    backgroundColor: "#F8F9FA",
    borderRadius: 4,
    width: "55%",
    marginRight: 16,
  },

  totals: {
    width: "45%",
    marginLeft: 16,
  },

  notesLabel: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 10,
    textTransform: "uppercase",
    color: "#7F8C8D",
    letterSpacing: 0.8,
    fontFamily: "Helvetica-Bold",
  },

  // Enhanced totals table with improved visual hierarchy (modernized - no border)
  totalsTable: {
    width: "100%",
    borderRadius: 4,
    overflow: "hidden",
  },

  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
  },

  totalsLastRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: "#2C3E50", // Deep granite accent
    fontWeight: "bold",
    fontSize: 12,
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
  },

  // Accent styling for important financial information
  accent: {
    color: "#2C3E50",
    fontWeight: "bold",
  },

  totalsLabel: {
    fontWeight: "bold",
    color: "#2C3E50",
    fontFamily: "Helvetica-Bold",
  },

  // Enhanced footer with better typography
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: "center" as "center",
    fontSize: 9,
    color: "#7F8C8D",
    borderTopWidth: 1,
    borderTopColor: "#ECF0F1",
    paddingTop: 10,
    fontFamily: "Helvetica",
  },

  // Payment information section
  paymentSection: {
    marginTop: 24,
    padding: 20,
    backgroundColor: "#F8F9FA",
    borderRadius: 4,
  },

  paymentTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 16,
    textTransform: "uppercase",
    color: "#2C3E50",
    letterSpacing: 0.8,
    fontFamily: "Helvetica-Bold",
  },

  paymentRow: {
    flexDirection: "row",
    marginBottom: 10,
  },

  paymentLabel: {
    fontSize: 9,
    fontWeight: "bold",
    width: "35%",
    color: "#7F8C8D",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontFamily: "Helvetica-Bold",
  },

  paymentValue: {
    fontSize: 10,
    flex: 1,
    color: "#2C3E50",
    fontFamily: "Helvetica",
  },

  // Improved spacing helpers
  mb4: { marginBottom: 4 },
  mb8: { marginBottom: 8 },
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
});
