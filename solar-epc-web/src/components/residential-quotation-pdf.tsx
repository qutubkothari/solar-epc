import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatCurrency } from "@/lib/format";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, lineHeight: 1.5 },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#1e3a8a' },
  section: { marginBottom: 20 },
  row: { flexDirection: "row", marginBottom: 6 },
  label: { width: "30%", fontWeight: "bold", color: '#4b5563' },
  value: { width: "70%", color: '#111827' },
  table: { marginTop: 10, borderTop: 1, borderLeft: 1, borderColor: '#d1d5db' },
  tableHeader: { flexDirection: "row", backgroundColor: "#f3f4f6", fontWeight: "bold" },
  tableRow: { flexDirection: "row" },
  tableCell: { padding: 8, borderRight: 1, borderBottom: 1, borderColor: '#d1d5db' },
  bold: { fontWeight: "bold" },
  footer: { marginTop: 40, borderTop: 1, borderColor: '#d1d5db', paddingTop: 10 },
  footerTitle: { fontWeight: 'bold', marginBottom: 10, fontSize: 12, color: '#1e3a8a' },
  footerText: { fontSize: 9, marginBottom: 4, color: '#4b5563' }
});

export function ResidentialQuotationPDF({ quotation }: any) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>RESIDENTIAL SOLAR QUOTATION</Text>
        
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Quotation Ref:</Text>
            <Text style={styles.value}>{quotation.proposalNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Client Name:</Text>
            <Text style={styles.value}>{quotation.clientName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{quotation.date}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>System Capacity:</Text>
            <Text style={styles.value}>{quotation.documentData.totalKw} kW</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Plant Type:</Text>
            <Text style={styles.value}>{quotation.documentData.plantType}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>DISCOM:</Text>
            <Text style={styles.value}>{quotation.documentData.discom}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Meter Phase:</Text>
            <Text style={styles.value}>{quotation.documentData.meterPhase}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { flex: 2, color: '#1f2937' }]}>ITEMS</Text>
            <Text style={[styles.tableCell, { flex: 3, color: '#1f2937' }]}>SPECIFICATION / DESCRIPTION</Text>
            <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right', color: '#1f2937' }]}>AMOUNT</Text>
          </View>
          
          {quotation.items.map((item: any, index: number) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2, fontWeight: 'bold' }]}>{item.category.toUpperCase()}</Text>
              <Text style={[styles.tableCell, { flex: 3 }]}>{item.description}</Text>
              <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
          
          <View style={[styles.tableRow, { backgroundColor: '#f9fafb' }]}>
            <Text style={[styles.tableCell, { flex: 5, textAlign: 'right', fontWeight: 'bold', color: '#111827' }]}>GRAND TOTAL</Text>
            <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right', fontWeight: 'bold', color: '#111827' }]}>{formatCurrency(quotation.grandTotal)}</Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Terms and Conditions</Text>
          <Text style={styles.footerText}>1. Quotation Validity: 10 days from the date of issuance. Prices are subject to change after this period.</Text>
          <Text style={styles.footerText}>2. Subsidy Amount is subject to PM-SURYA GHAR: MUFT BIJLI YOJNA. Hi-Tech Solar Solution is not responsible for any kind of changes / delays and deduction in subsidy rate.</Text>
          <Text style={styles.footerText}>3. Warranty: Hi-Tech Solar Solution warrants the installation workmanship for a period of 5 years from the date of commissioning.</Text>
          <Text style={styles.footerText}>4. Solar panels, Inverter, MCB, Fuse & cartridges and other equipment are subject to manufacturer warranties.</Text>
          <Text style={styles.footerText}>5. Exclusions: Damage caused by acts of nature, accidents, misuse, or unauthorized modifications are not covered.</Text>
        </View>
      </Page>
    </Document>
  );
}
