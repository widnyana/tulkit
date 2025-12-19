import { StyleSheet } from "@react-pdf/renderer";

// Template-specific styles for the default template
export const defaultTemplateStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 11,
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 120,
    objectFit: "contain",
  },
  companyInfo: {
    textAlign: "right" as const,
  },
  invoiceTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center" as const,
    color: "#2563eb", // blue color for better visual hierarchy
  },
  invoiceNumber: {
    fontSize: 12,
    textAlign: "center" as const,
    color: "#64748b", // gray color for less prominence
    marginBottom: 20,
  },
  detailsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    padding: 15,
    borderRadius: 6,
  },
  senderInfo: {
    flex: 1,
    paddingRight: 20,
  },
  recipientInfo: {
    flex: 1,
  },
  recipientInfoText: {
    textAlign: "right" as const,
  },
  label: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 5,
    textTransform: "uppercase",
    color: "#475569", // slate color for labels
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 10,
    marginBottom: 4,
    lineHeight: 1.4,
  },
  contactValue: {
    fontSize: 10,
    marginBottom: 4,
    lineHeight: 1.4,
    color: "#1e293b", // slightly darker text for contact info
  },
  table: {
    width: "auto",
    marginBottom: 30,
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  headerRow: {
    backgroundColor: "#e2e8f0", // light gray header background
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  descriptionColHeader: {
    width: "50%",
    padding: 8,
    textAlign: "left" as const,
    fontWeight: "bold",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  narrowColHeader: {
    width: "16.66%",
    padding: 8,
    textAlign: "center" as const,
    fontWeight: "bold",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  descriptionCol: {
    width: "50%",
    padding: 8,
    textAlign: "left" as const,
    fontSize: 10,
  },
  narrowCol: {
    width: "16.66%",
    padding: 8,
    textAlign: "center" as const,
    fontSize: 10,
  },
  notes: {
    padding: 12,
    backgroundColor: "#f1f5f9", // light gray background for notes
    borderRadius: 4,
    flex: 1,
    marginRight: 20,
  },
  totalsContainer: {
    flexDirection: "row",
    marginTop: 20,
  },
  notesAndTotalsContainer: {
    flexDirection: "row",
    marginTop: 20,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  notesLabel: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 6,
    textTransform: "uppercase",
    color: "#475569",
    letterSpacing: 0.5,
  },
  itemNotesContainer: {
    paddingLeft: 5,
    paddingRight: 5,
    paddingTop: 2,
    paddingBottom: 4,
    width: "100%",
  },
  itemNotesLabel: {
    fontSize: 9,
    fontStyle: "italic",
    paddingLeft: 5,
    color: "#64748b",
  },
  totals: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
  },
  totalsTable: {
    width: 180,
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  totalsLastRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 8,
    borderTopWidth: 2,
    borderTopColor: "#1e293b",
    fontWeight: "bold",
    fontSize: 12,
  },
  totalsLabel: {
    fontWeight: "bold",
    color: "#1e293b",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: "center" as const,
    fontSize: 8,
    color: "#64748b",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
  },
});
