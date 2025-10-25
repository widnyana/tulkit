import { StyleSheet } from "@react-pdf/renderer";

// Template-specific styles for the default template
export const defaultTemplateStyles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
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
    width: 100,
    height: 100,
    objectFit: "contain",
  },
  companyInfo: {
    textAlign: "right" as "right",
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center" as "center",
  },
  detailsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  senderInfo: {
    flex: 1,
    paddingRight: 20,
  },
  recipientInfo: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 5,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 12,
    marginBottom: 5,
  },
  table: {
    width: "auto",
    marginBottom: 30,
  },
  tableRow: {
    flexDirection: "row",
  },
  descriptionColHeader: {
    width: "50%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#000",
    backgroundColor: "#f0f0f0",
    padding: 5,
    textAlign: "left" as "left",
  },
  narrowColHeader: {
    width: "16.66%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#000",
    backgroundColor: "#f0f0f0",
    padding: 5,
    textAlign: "center" as "center",
  },
  descriptionCol: {
    width: "50%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#000",
    padding: 5,
    textAlign: "left" as "left",
  },
  narrowCol: {
    width: "16.66%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#000",
    padding: 5,
    textAlign: "center" as "center",
  },
  notes: {
    marginTop: 30,
    fontSize: 12,
  },
  itemNotesContainer: {
    paddingLeft: 5,
    paddingRight: 5,
    paddingTop: 2,
    paddingBottom: 4,
    width: "100%",
  },
  itemNotesLabel: {
    fontSize: 10,
    fontStyle: "italic",
    paddingLeft: 5,
    color: "#555",
  },
  totals: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
  },
  totalsTable: {
    width: 150,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  totalsLabel: {
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center" as "center",
    fontSize: 10,
    color: "#666",
  },
});
