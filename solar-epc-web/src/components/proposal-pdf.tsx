import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";

// Register fonts for better appearance
Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2" },
    { src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiA.woff2", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiA.woff2", fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Inter",
    fontSize: 10,
    lineHeight: 1.6,
  },
  coverPage: {
    padding: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  coverLogo: {
    width: 120,
    height: 120,
    marginBottom: 40,
  },
  coverTitle: {
    fontSize: 36,
    fontWeight: 700,
    color: "#f59e0b",
    marginBottom: 20,
  },
  coverSubtitle: {
    fontSize: 18,
    color: "#ffffff",
    marginBottom: 10,
  },
  coverClient: {
    fontSize: 24,
    fontWeight: 600,
    color: "#f59e0b",
    marginTop: 40,
    marginBottom: 10,
  },
  coverDate: {
    fontSize: 12,
    color: "#cbd5e1",
    marginTop: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottom: "2 solid #f59e0b",
  },
  logo: {
    width: 60,
    height: 60,
  },
  headerText: {
    fontSize: 8,
    color: "#64748b",
    textAlign: "right",
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: "1 solid #e2e8f0",
  },
  text: {
    fontSize: 10,
    color: "#334155",
    marginBottom: 5,
  },
  bold: {
    fontWeight: 600,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  label: {
    fontSize: 10,
    color: "#64748b",
    width: "40%",
  },
  value: {
    fontSize: 10,
    color: "#0f172a",
    fontWeight: 600,
    width: "60%",
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f59e0b",
    padding: 8,
    fontWeight: 700,
    color: "#ffffff",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #e2e8f0",
    padding: 8,
    fontSize: 9,
  },
  tableCell: {
    flex: 1,
  },
  highlight: {
    backgroundColor: "#fef3c7",
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
  },
  highlightTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#92400e",
    marginBottom: 8,
  },
  highlightText: {
    fontSize: 10,
    color: "#78350f",
    marginBottom: 4,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 8,
    borderTop: "1 solid #e2e8f0",
    paddingTop: 10,
  },
  pageNumber: {
    position: "absolute",
    bottom: 20,
    right: 40,
    fontSize: 8,
    color: "#94a3b8",
  },
});

type ProposalPDFProps = {
  proposal: {
    proposalNumber: string;
    client: { name: string; address?: string; contactName?: string };
    companyName?: string;
    companyLogo?: string;
    clientLogo?: string;
    introText?: string;
    siteAddress?: string;
    consumerNumber?: string;
    consumerType?: string;
    sanctionedLoad?: number;
    contractDemand?: number;
    avgMonthlyUnits?: number;
    avgMonthlyBill?: number;
    currentTariff?: number;
    systemCapacity?: number;
    annualGeneration?: number;
    performanceRatio?: number;
    degradationRate?: number;
    systemLifespan?: number;
    panelSpec?: any;
    inverterSpec?: any;
    systemCost?: number;
    subsidyAmount?: number;
    netCost?: number;
    paybackPeriod?: number;
    roi?: number;
    savingsYear1?: number;
    savings25Year?: number;
    scopeOfWork?: string;
    termsConditions?: string;
    specialNotes?: string;
    validUntil?: string;
    preparedBy?: string;
    contactPerson?: string;
    contactPhone?: string;
    contactEmail?: string;
    items: Array<{
      category?: string;
      description?: string;
      specifications?: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      warranty?: string;
      brand?: string;
      model?: string;
    }>;
  };
};

export function ProposalPDF({ proposal }: ProposalPDFProps) {
  const formatCurrency = (value?: number) =>
    value ? `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";

  const formatDate = (date?: string) => {
    if (!date) return new Date().toLocaleDateString("en-IN");
    return new Date(date).toLocaleDateString("en-IN");
  };

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.coverPage}>
        {proposal.companyLogo && (
          <Image src={proposal.companyLogo} style={styles.coverLogo} />
        )}
        <Text style={styles.coverTitle}>TECHNICAL PROPOSAL</Text>
        <Text style={styles.coverSubtitle}>Solar PV System Design & Implementation</Text>
        <Text style={styles.coverClient}>{proposal.client.name}</Text>
        {proposal.clientLogo && (
          <Image src={proposal.clientLogo} style={{ width: 80, height: 80, marginTop: 20 }} />
        )}
        <Text style={styles.coverDate}>Proposal No: {proposal.proposalNumber}</Text>
        <Text style={styles.coverDate}>{formatDate()}</Text>
      </Page>

      {/* Introduction Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              {proposal.companyName || "Solar EPC Company"}
            </Text>
            <Text style={styles.headerText}>Proposal No: {proposal.proposalNumber}</Text>
          </View>
          {proposal.companyLogo && <Image src={proposal.companyLogo} style={styles.logo} />}
        </View>

        <Text style={styles.title}>Executive Summary</Text>

        <View style={styles.section}>
          <Text style={styles.text}>
            {proposal.introText || 
              `We are pleased to present this comprehensive technical proposal for the installation of a Solar Photovoltaic (PV) system at ${proposal.siteAddress || "your facility"}. This proposal outlines the complete system design, equipment specifications, financial analysis, and expected performance of the proposed solar power plant.`}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Client Name:</Text>
            <Text style={styles.value}>{proposal.client.name}</Text>
          </View>
          {proposal.client.contactName && (
            <View style={styles.row}>
              <Text style={styles.label}>Contact Person:</Text>
              <Text style={styles.value}>{proposal.client.contactName}</Text>
            </View>
          )}
          {proposal.siteAddress && (
            <View style={styles.row}>
              <Text style={styles.label}>Site Address:</Text>
              <Text style={styles.value}>{proposal.siteAddress}</Text>
            </View>
          )}
          {proposal.consumerNumber && (
            <View style={styles.row}>
              <Text style={styles.label}>Consumer Number:</Text>
              <Text style={styles.value}>{proposal.consumerNumber}</Text>
            </View>
          )}
          {proposal.consumerType && (
            <View style={styles.row}>
              <Text style={styles.label}>Consumer Type:</Text>
              <Text style={styles.value}>{proposal.consumerType}</Text>
            </View>
          )}
        </View>

        <View style={styles.highlight}>
          <Text style={styles.highlightTitle}>Proposed System Highlights</Text>
          <Text style={styles.highlightText}>
            System Capacity: {proposal.systemCapacity} kWp
          </Text>
          <Text style={styles.highlightText}>
            Annual Generation: {proposal.annualGeneration?.toLocaleString("en-IN")} kWh
          </Text>
          <Text style={styles.highlightText}>
            Total Investment: {formatCurrency(proposal.systemCost)}
          </Text>
          <Text style={styles.highlightText}>
            Payback Period: {proposal.paybackPeriod} years
          </Text>
          <Text style={styles.highlightText}>
            25-Year Savings: {formatCurrency(proposal.savings25Year)}
          </Text>
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber }) => `Page ${pageNumber}`} fixed />
      </Page>

      {/* Consumption Analysis */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              {proposal.companyName || "Solar EPC Company"}
            </Text>
            <Text style={styles.headerText}>Proposal No: {proposal.proposalNumber}</Text>
          </View>
          {proposal.companyLogo && <Image src={proposal.companyLogo} style={styles.logo} />}
        </View>

        <Text style={styles.title}>Current Consumption Analysis</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Existing Energy Profile</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Sanctioned Load:</Text>
            <Text style={styles.value}>{proposal.sanctionedLoad} kW</Text>
          </View>
          {proposal.contractDemand && (
            <View style={styles.row}>
              <Text style={styles.label}>Contract Demand:</Text>
              <Text style={styles.value}>{proposal.contractDemand} kVA</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Average Monthly Consumption:</Text>
            <Text style={styles.value}>{proposal.avgMonthlyUnits?.toLocaleString("en-IN")} kWh</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Average Monthly Bill:</Text>
            <Text style={styles.value}>{formatCurrency(proposal.avgMonthlyBill)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Current Tariff Rate:</Text>
            <Text style={styles.value}>₹{proposal.currentTariff}/kWh</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Annual Electricity Cost:</Text>
            <Text style={styles.value}>{formatCurrency((proposal.avgMonthlyBill || 0) * 12)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Energy Consumption Insights</Text>
          <Text style={styles.text}>
            Based on your current consumption pattern, your facility consumes approximately{" "}
            {((proposal.avgMonthlyUnits || 0) * 12).toLocaleString("en-IN")} kWh annually, resulting in an
            electricity expense of {formatCurrency((proposal.avgMonthlyBill || 0) * 12)} per year.
          </Text>
          <Text style={styles.text}>
            The proposed solar system will offset a significant portion of this consumption, providing substantial
            savings on your electricity bills while reducing your carbon footprint.
          </Text>
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber }) => `Page ${pageNumber}`} fixed />
      </Page>

      {/* System Design */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              {proposal.companyName || "Solar EPC Company"}
            </Text>
            <Text style={styles.headerText}>Proposal No: {proposal.proposalNumber}</Text>
          </View>
          {proposal.companyLogo && <Image src={proposal.companyLogo} style={styles.logo} />}
        </View>

        <Text style={styles.title}>Proposed System Design</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Specifications</Text>
          <View style={styles.row}>
            <Text style={styles.label}>System Capacity:</Text>
            <Text style={styles.value}>{proposal.systemCapacity} kWp</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Estimated Annual Generation:</Text>
            <Text style={styles.value}>{proposal.annualGeneration?.toLocaleString("en-IN")} kWh/year</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Performance Ratio:</Text>
            <Text style={styles.value}>{proposal.performanceRatio}%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Annual Degradation:</Text>
            <Text style={styles.value}>{proposal.degradationRate}%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>System Lifespan:</Text>
            <Text style={styles.value}>{proposal.systemLifespan} years</Text>
          </View>
        </View>

        {proposal.panelSpec && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Solar Panel Specifications</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Brand:</Text>
              <Text style={styles.value}>{proposal.panelSpec.brand}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Model:</Text>
              <Text style={styles.value}>{proposal.panelSpec.model}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Wattage per Panel:</Text>
              <Text style={styles.value}>{proposal.panelSpec.wattage} Wp</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Quantity:</Text>
              <Text style={styles.value}>{proposal.panelSpec.quantity} nos</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Warranty:</Text>
              <Text style={styles.value}>{proposal.panelSpec.warranty}</Text>
            </View>
          </View>
        )}

        {proposal.inverterSpec && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Inverter Specifications</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Brand:</Text>
              <Text style={styles.value}>{proposal.inverterSpec.brand}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Model:</Text>
              <Text style={styles.value}>{proposal.inverterSpec.model}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Capacity:</Text>
              <Text style={styles.value}>{proposal.inverterSpec.capacity} kW</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Quantity:</Text>
              <Text style={styles.value}>{proposal.inverterSpec.quantity} nos</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Warranty:</Text>
              <Text style={styles.value}>{proposal.inverterSpec.warranty}</Text>
            </View>
          </View>
        )}

        <Text style={styles.pageNumber} render={({ pageNumber }) => `Page ${pageNumber}`} fixed />
      </Page>

      {/* Bill of Quantities */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              {proposal.companyName || "Solar EPC Company"}
            </Text>
            <Text style={styles.headerText}>Proposal No: {proposal.proposalNumber}</Text>
          </View>
          {proposal.companyLogo && <Image src={proposal.companyLogo} style={styles.logo} />}
        </View>

        <Text style={styles.title}>Bill of Quantities</Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { flex: 3 }]}>Description</Text>
            <Text style={[styles.tableCell, { flex: 2 }]}>Brand/Model</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>Qty</Text>
            <Text style={[styles.tableCell, { flex: 1.5 }]}>Rate</Text>
            <Text style={[styles.tableCell, { flex: 1.5 }]}>Amount</Text>
          </View>

          {proposal.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={[styles.tableCell, { flex: 3 }]}>
                <Text style={{ fontWeight: 600 }}>{item.category}</Text>
                <Text style={{ fontSize: 8, color: "#64748b" }}>{item.description}</Text>
                {item.specifications && (
                  <Text style={{ fontSize: 8, color: "#64748b" }}>{item.specifications}</Text>
                )}
              </View>
              <Text style={[styles.tableCell, { flex: 2 }]}>
                {item.brand} {item.model}
              </Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, { flex: 1.5 }]}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={[styles.tableCell, { flex: 1.5 }]}>{formatCurrency(item.totalPrice)}</Text>
            </View>
          ))}

          <View style={[styles.tableRow, { backgroundColor: "#fef3c7", fontWeight: 700 }]}>
            <Text style={[styles.tableCell, { flex: 8.5, textAlign: "right" }]}>Total System Cost:</Text>
            <Text style={[styles.tableCell, { flex: 1.5 }]}>{formatCurrency(proposal.systemCost)}</Text>
          </View>

          {proposal.subsidyAmount && proposal.subsidyAmount > 0 && (
            <>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 8.5, textAlign: "right" }]}>Less: Subsidy:</Text>
                <Text style={[styles.tableCell, { flex: 1.5, color: "#16a34a" }]}>
                  -{formatCurrency(proposal.subsidyAmount)}
                </Text>
              </View>
              <View style={[styles.tableRow, { backgroundColor: "#f59e0b", color: "#ffffff", fontWeight: 700 }]}>
                <Text style={[styles.tableCell, { flex: 8.5, textAlign: "right" }]}>Net Cost to Client:</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{formatCurrency(proposal.netCost)}</Text>
              </View>
            </>
          )}
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber }) => `Page ${pageNumber}`} fixed />
      </Page>

      {/* Financial Analysis */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              {proposal.companyName || "Solar EPC Company"}
            </Text>
            <Text style={styles.headerText}>Proposal No: {proposal.proposalNumber}</Text>
          </View>
          {proposal.companyLogo && <Image src={proposal.companyLogo} style={styles.logo} />}
        </View>

        <Text style={styles.title}>Financial Analysis & ROI</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Investment Summary</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Total System Cost:</Text>
            <Text style={styles.value}>{formatCurrency(proposal.systemCost)}</Text>
          </View>
          {proposal.subsidyAmount && proposal.subsidyAmount > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Applicable Subsidy:</Text>
              <Text style={[styles.value, { color: "#16a34a" }]}>{formatCurrency(proposal.subsidyAmount)}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Net Investment:</Text>
            <Text style={styles.value}>{formatCurrency(proposal.netCost)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Return on Investment</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Payback Period:</Text>
            <Text style={styles.value}>{proposal.paybackPeriod} years</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>ROI (25 years):</Text>
            <Text style={styles.value}>{proposal.roi}%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>First Year Savings:</Text>
            <Text style={styles.value}>{formatCurrency(proposal.savingsYear1)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total 25-Year Savings:</Text>
            <Text style={[styles.value, { color: "#16a34a", fontSize: 12 }]}>
              {formatCurrency(proposal.savings25Year)}
            </Text>
          </View>
        </View>

        <View style={styles.highlight}>
          <Text style={styles.highlightTitle}>Environmental Impact</Text>
          <Text style={styles.highlightText}>
            CO₂ Offset (25 years): {((proposal.annualGeneration || 0) * 25 * 0.82 / 1000).toFixed(2)} tonnes
          </Text>
          <Text style={styles.highlightText}>
            Equivalent Trees Planted: {Math.round((proposal.annualGeneration || 0) * 25 * 0.82 / 1000 * 50)} trees
          </Text>
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber }) => `Page ${pageNumber}`} fixed />
      </Page>

      {/* Scope of Work & Terms */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              {proposal.companyName || "Solar EPC Company"}
            </Text>
            <Text style={styles.headerText}>Proposal No: {proposal.proposalNumber}</Text>
          </View>
          {proposal.companyLogo && <Image src={proposal.companyLogo} style={styles.logo} />}
        </View>

        <Text style={styles.title}>Scope of Work</Text>

        <View style={styles.section}>
          <Text style={styles.text}>
            {proposal.scopeOfWork ||
              `1. Site Survey and Technical Assessment\n2. System Design and Engineering\n3. Procurement of Equipment and Materials\n4. Civil and Structural Works\n5. Electrical Installation and Wiring\n6. Grid Synchronization and Net Metering\n7. Testing and Commissioning\n8. Training and Documentation\n9. Handover to Client\n10. Warranty and AMC Support`}
          </Text>
        </View>

        <Text style={styles.title}>Terms & Conditions</Text>

        <View style={styles.section}>
          <Text style={styles.text}>
            {proposal.termsConditions ||
              `1. Prices are valid for ${proposal.validUntil ? `until ${formatDate(proposal.validUntil)}` : "30 days"}\n2. 30% advance, 60% on material delivery, 10% on commissioning\n3. Installation timeline: 4-6 weeks from advance payment\n4. Client to provide necessary approvals and permits\n5. Warranty: Solar Panels 25 years, Inverters 5 years, Structure 5 years\n6. Force majeure clause applicable\n7. Dispute resolution: Arbitration as per Indian law`}
          </Text>
        </View>

        {proposal.specialNotes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Notes</Text>
            <Text style={styles.text}>{proposal.specialNotes}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Prepared By:</Text>
            <Text style={styles.value}>{proposal.preparedBy}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Contact Person:</Text>
            <Text style={styles.value}>{proposal.contactPerson}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{proposal.contactPhone}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{proposal.contactEmail}</Text>
          </View>
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber }) => `Page ${pageNumber}`} fixed />
      </Page>
    </Document>
  );
}
