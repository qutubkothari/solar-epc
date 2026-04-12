export type PaymentStage = {
  label: string;
  milestone: string;
  percentage: number;
  remarks: string;
};

export type BankDetails = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  accountType: string;
  ifscCode: string;
  branch: string;
};

export type ScopeOfWorkRow = {
  srNo: string;
  workItem: string;
  responsibility: string;
  remarks: string;
};

export type GenerationTableRow = {
  month: string;
  unitsPerDay: number;
  days: number;
};

export type QuotationDocumentData = {
  consumerType: string;
  consumerNumber: string;
  preparedFor: string;
  customerContactPerson: string;
  preparedBy: string;
  validityDays: number;
  moduleWattage: number;
  numberOfModules: number;
  totalWatts: number;
  totalKw: number;
  systemType: string;
  requiredAreaFactorSqftPerKw: number;
  expectedGenerationUnitsPerKw: number;
  electricityTariffYear1: number;
  generationTable: GenerationTableRow[];
  structureHeightSouth: string;
  structureHeightNorth: string;
  arrayLayout: string;
  monitoringSystem: string;
  netMeteringProvision: string;
  approvalsCompliance: string;
  projectCompletionTimeline: string;
  moduleWarranty: string;
  inverterWarranty: string;
  structureWindSpeed: string;
  freeOperationMaintenance: string;
  gedaRegistrationCharges: number;
  netMeteringCharges: number;
  meterCharges: number;
  paymentStages: PaymentStage[];
  scopeOfWorkRows: ScopeOfWorkRow[];
  requiredDocuments: string[];
  bankDetails: BankDetails;
};

const DEFAULT_PAYMENT_STAGES: PaymentStage[] = [
  {
    label: "Stage 1: Booking Amount",
    milestone: "At the time of order confirmation.",
    percentage: 10,
    remarks: "Ensures order confirmation and documentation.",
  },
  {
    label: "Stage 2: Approval Process",
    milestone: "After registration and feasibility approval.",
    percentage: 30,
    remarks: "Covers registration and initial processing work.",
  },
  {
    label: "Stage 3: Installation",
    milestone: "After delivery of materials and start of installation work.",
    percentage: 30,
    remarks: "For procurement of materials and labor costs.",
  },
  {
    label: "Stage 4: Testing & Inspection",
    milestone: "After successful installation and inspection approval.",
    percentage: 20,
    remarks: "Covers inspection, testing, and net metering processes.",
  },
  {
    label: "Stage 5: Project Handover",
    milestone: "On successful commissioning and handover of the solar plant.",
    percentage: 10,
    remarks: "Final settlement after completion of the project.",
  },
];

const DEFAULT_REQUIRED_DOCUMENTS = [
  "Latest Electricity Bill",
  "Ownership proof",
  "Aadhar & PAN card of authorized person",
  "PAN card & cancelled cheque of firm",
  "Passport size photo of authorized person",
  "GST certificate",
  "Undertaking on stamp paper",
  "Authorization letter",
];

const DEFAULT_GENERATION_TABLE: GenerationTableRow[] = [
  { month: "Jan", unitsPerDay: 4.6, days: 31 },
  { month: "Feb", unitsPerDay: 4.6, days: 28 },
  { month: "Mar", unitsPerDay: 5, days: 31 },
  { month: "Apr", unitsPerDay: 5, days: 30 },
  { month: "May", unitsPerDay: 5, days: 31 },
  { month: "Jun", unitsPerDay: 5, days: 30 },
  { month: "Jul", unitsPerDay: 4.1, days: 31 },
  { month: "Aug", unitsPerDay: 4.1, days: 31 },
  { month: "Sep", unitsPerDay: 3.9, days: 30 },
  { month: "Oct", unitsPerDay: 4.6, days: 31 },
  { month: "Nov", unitsPerDay: 4.6, days: 30 },
  { month: "Dec", unitsPerDay: 4.6, days: 31 },
];

const DEFAULT_SCOPE_OF_WORK_ROWS: ScopeOfWorkRow[] = [
  {
    srNo: "1",
    workItem: "Project Development & Engineering",
    responsibility: "Section",
    remarks: "Category heading from Quotation Format - 3",
  },
  {
    srNo: "1.1",
    workItem: "Feasibility Study (technical & financial)",
    responsibility: "Consumer with EPC Contractor",
    remarks: "Can be jointly discussed with EPC.",
  },
  {
    srNo: "1.2",
    workItem: "Site Survey & Assessment",
    responsibility: "EPC Contractor",
    remarks: "Includes structural and electrical feasibility.",
  },
  {
    srNo: "1.3",
    workItem: "System Design & Engineering Drawings",
    responsibility: "EPC Contractor",
    remarks: "Electrical SLD, layout, shadow analysis, etc.",
  },
  {
    srNo: "1.4",
    workItem: "Statutory and Safety Compliance (design level)",
    responsibility: "EPC Contractor",
    remarks: "Must follow MNRE, DISCOM, CEIG norms.",
  },
  {
    srNo: "1.5",
    workItem: "Land Levelling and Grading/Tree Cutting",
    responsibility: "Consumer",
    remarks: "In Consumer Scope",
  },
  {
    srNo: "1.6",
    workItem: "Cable Trenches",
    responsibility: "Consumer",
    remarks: "Existing Trenches considered",
  },
  {
    srNo: "1.7",
    workItem: "Control Rooms (RCC/PEB)",
    responsibility: "Consumer",
    remarks: "Existing Covered Space in Control Room considered",
  },
  {
    srNo: "1.8",
    workItem: "Water Drainage",
    responsibility: "Consumer",
    remarks: "In Customer Scope. Existing Drainage Considered",
  },
  {
    srNo: "1.9",
    workItem: "Water and Electricity",
    responsibility: "Consumer",
    remarks: "Supply of Free Water and Free Electricity in Customer Scope. during I&C and O&M (If Appl.)",
  },
  {
    srNo: "2",
    workItem: "Procurement & Supply",
    responsibility: "Section",
    remarks: "Category heading from Quotation Format - 3",
  },
  {
    srNo: "2.1",
    workItem: "Procurement of Solar Modules (approved make)",
    responsibility: "EPC Contractor",
    remarks: "Must meet MNRE ALMM list and BIS norms.",
  },
  {
    srNo: "2.2",
    workItem: "Procurement of Inverters",
    responsibility: "EPC Contractor",
    remarks: "Must meet DISCOM & MNRE specs.",
  },
  {
    srNo: "2.3",
    workItem: "Procurement of Mounting Structures",
    responsibility: "EPC Contractor",
    remarks: "Corrosion-resistant (hot dip galvanized).",
  },
  {
    srNo: "2.4",
    workItem: "Cables, Junction Boxes, Earthing Material",
    responsibility: "EPC Contractor",
    remarks: "IS-compliant cables and materials.",
  },
  {
    srNo: "2.5",
    workItem: "Transportation to Site",
    responsibility: "EPC Contractor",
    remarks: "Delivered to consumer site.",
  },
  {
    srNo: "3",
    workItem: "Installation & Construction",
    responsibility: "Section",
    remarks: "Category heading from Quotation Format - 3",
  },
  {
    srNo: "3.1",
    workItem: "Module Mounting Structure Installation",
    responsibility: "EPC Contractor",
    remarks: "Based on roof type (RCC, sheet metal, etc.).",
  },
  {
    srNo: "3.2",
    workItem: "Module Installation",
    responsibility: "EPC Contractor",
    remarks: "Including alignment and clamping.",
  },
  {
    srNo: "3.3",
    workItem: "Inverter & Electrical Panel Installation",
    responsibility: "EPC Contractor",
    remarks: "Includes ACDB, DCDB, SPD, meters, etc.",
  },
  {
    srNo: "3.4",
    workItem: "Earthing, Lightning Protection System",
    responsibility: "EPC Contractor",
    remarks: "Minimum 2 earth pits per inverter.",
  },
  {
    srNo: "3.5",
    workItem: "Cable Laying and Termination",
    responsibility: "EPC Contractor",
    remarks: "As per standard cable routing practices.",
  },
  {
    srNo: "3.6",
    workItem: "ACDB to Client LT Panel (AC Cabling)",
    responsibility: "EPC Contractor",
    remarks: "All AC Cables above 16 mm2: 1.1KV Al conductor (Class-2), GS Armoured, XLPE Insulation, PVC outer sheath Cable.",
  },
  {
    srNo: "3.7",
    workItem: "Client LT Panel to Client HT Panel (AC Cabling)",
    responsibility: "DISCOM",
    remarks: "N/A",
  },
  {
    srNo: "3.8",
    workItem: "Cable Tray/ Conduits with supporting structures",
    responsibility: "EPC Contractor",
    remarks: "Conduits have been considered for DC/AC cable Routing",
  },
  {
    srNo: "3.9",
    workItem: "HT Panel",
    responsibility: "N/A",
    remarks: "Evacuation considered at LT Panel of same building @415V",
  },
  {
    srNo: "3.10",
    workItem: "Step-Up Transf. & Accessories",
    responsibility: "N/A",
    remarks: "Evacuation considered at LT Panel of same building @415V",
  },
  {
    srNo: "3.11",
    workItem: "Module Cleaning System",
    responsibility: "Consumer",
    remarks: "In Consumer Scope",
  },
  {
    srNo: "3.12",
    workItem: "Hand Rail",
    responsibility: "Consumer",
    remarks: "Handrail/Parapet Walls on RCC Roofs in Customer Scope.",
  },
  {
    srNo: "3.13",
    workItem: "Staircase/Monkey Ladder",
    responsibility: "Consumer",
    remarks: "Site Access (Staircase) in Customer Scope",
  },
  {
    srNo: "3.14",
    workItem: "PV-DG Controller",
    responsibility: "Consumer",
    remarks: "Not Considered in any form ie . RPR/ Fuel Saver PLC Based PVDG Controller, etc.",
  },
  {
    srNo: "3.6",
    workItem: "Civil Works (if required)",
    responsibility: "EPC Contractor",
    remarks: "Pedestals, cable trenching (if needed).",
  },
  {
    srNo: "4",
    workItem: "Grid Connection & Net Metering",
    responsibility: "Section",
    remarks: "Category heading from Quotation Format - 3",
  },
  {
    srNo: "4.1",
    workItem: "Liaisoning with DISCOM for Grid Approval",
    responsibility: "EPC Contractor (mostly)",
    remarks: "Consumer may assist in document signatures.",
  },
  {
    srNo: "4.2",
    workItem: "Application for Net Metering",
    responsibility: "EPC Contractor (with Consumer)",
    remarks: "Consumer's documents like PAN, Aadhaar needed.",
  },
  {
    srNo: "4.3",
    workItem: "Procurement of Bi-directional meter, Modem And Meter Box",
    responsibility: "Consumer (With EPC Contractor)",
    remarks: "Only Applicable In HT Consumers.",
  },
  {
    srNo: "4.4",
    workItem: "Installation of Net Meter",
    responsibility: "DISCOM (coordinated by EPC)",
    remarks: "EPC will ensure DISCOM visit and coordination.",
  },
  {
    srNo: "4.5",
    workItem: "CEIG Approval (if required)",
    responsibility: "EPC Contractor (with Consumer)",
    remarks: "Required for capacity >10kW in Gujarat.",
  },
  {
    srNo: "5",
    workItem: "Testing & Commissioning",
    responsibility: "Section",
    remarks: "Category heading from Quotation Format - 3",
  },
  {
    srNo: "5.1",
    workItem: "System Testing (insulation, polarity, continuity, etc.)",
    responsibility: "EPC Contractor",
    remarks: "Complete testing prior to energization.",
  },
  {
    srNo: "5.2",
    workItem: "Synchronization with Grid",
    responsibility: "EPC Contractor",
    remarks: "In coordination with DISCOM.",
  },
  {
    srNo: "5.3",
    workItem: "Final Commissioning",
    responsibility: "EPC Contractor",
    remarks: "Post-approval and net meter installation.",
  },
  {
    srNo: "6",
    workItem: "Documentation & Handover",
    responsibility: "Section",
    remarks: "Category heading from Quotation Format - 3",
  },
  {
    srNo: "6.1",
    workItem: "Submission of Final Drawings & Technical Documents",
    responsibility: "EPC Contractor",
    remarks: "Includes SLDs, datasheets, manuals.",
  },
  {
    srNo: "6.2",
    workItem: "Warranty Certificates",
    responsibility: "EPC Contractor",
    remarks: "For modules, inverters, BOS items.",
  },
  {
    srNo: "6.3",
    workItem: "O&M Manual & Training to Consumer Staff",
    responsibility: "EPC Contractor",
    remarks: "Brief on periodic maintenance & troubleshooting.",
  },
  {
    srNo: "7",
    workItem: "Operation & Maintenance",
    responsibility: "Section",
    remarks: "Category heading from Quotation Format - 3",
  },
  {
    srNo: "7.1",
    workItem: "O&M Responsibility ( 5 year free O&M typically)",
    responsibility: "EPC Contractor",
    remarks: "Optional extension through AMC.",
  },
  {
    srNo: "7.2",
    workItem: "Performance Monitoring System",
    responsibility: "EPC Contractor",
    remarks: "Remote monitoring (Wi-Fi/GPRS) for real-time data.",
  },
  {
    srNo: "8",
    workItem: "Commercial Aspects",
    responsibility: "Section",
    remarks: "Category heading from Quotation Format - 3",
  },
  {
    srNo: "8.1",
    workItem: "Project Financing",
    responsibility: "Consumer",
    remarks: "Unless provided by EPC under RESCO/lease.",
  },
  {
    srNo: "8.2",
    workItem: "Insurance of Plant (during & post-installation)",
    responsibility: "Consumer",
    remarks: "in consumer scope",
  },
  {
    srNo: "8.3",
    workItem: "Payment Terms",
    responsibility: "Consumer",
    remarks: "As per contract milestones.",
  },
  {
    srNo: "8.4",
    workItem: "Transportation",
    responsibility: "EPC Contractor",
    remarks: "Include in EPC Contractor Scope.",
  },
  {
    srNo: "8.5",
    workItem: "Payment Terms",
    responsibility: "Consumer",
    remarks: "As per contract milestones.",
  },
];

const DEFAULT_BANK_DETAILS: BankDetails = {
  bankName: "AU Small Finance Bank",
  accountName: "Hi-Tech Solar Solution",
  accountNumber: "1107865152531445",
  accountType: "Current Account",
  ifscCode: "AUBL0002158",
  branch: "Dahod",
};

const asString = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const asNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const createDefaultQuotationDocumentData = (
  overrides?: Partial<QuotationDocumentData>
): QuotationDocumentData => {
  const moduleWattage = overrides?.moduleWattage ?? 550;
  const numberOfModules = overrides?.numberOfModules ?? 10;
  const totalWatts = overrides?.totalWatts ?? moduleWattage * numberOfModules;
  const totalKw = overrides?.totalKw ?? Number((totalWatts / 1000).toFixed(2));

  return {
    consumerType: overrides?.consumerType ?? "LT Consumer",
    consumerNumber: overrides?.consumerNumber ?? "",
    preparedFor: overrides?.preparedFor ?? "",
    customerContactPerson: overrides?.customerContactPerson ?? "",
    preparedBy: overrides?.preparedBy ?? "Er. Ilyas Kaydawala",
    validityDays: overrides?.validityDays ?? 10,
    moduleWattage,
    numberOfModules,
    totalWatts,
    totalKw,
    systemType: overrides?.systemType ?? "On Grid",
    requiredAreaFactorSqftPerKw: overrides?.requiredAreaFactorSqftPerKw ?? 50,
    expectedGenerationUnitsPerKw: overrides?.expectedGenerationUnitsPerKw ?? 4.59,
    electricityTariffYear1: overrides?.electricityTariffYear1 ?? 8,
    generationTable: (overrides?.generationTable ?? DEFAULT_GENERATION_TABLE).map((entry) => ({ ...entry })),
    structureHeightSouth: overrides?.structureHeightSouth ?? "15 ft",
    structureHeightNorth: overrides?.structureHeightNorth ?? "17 ft",
    arrayLayout: overrides?.arrayLayout ?? "South Facing, 14° Tilt, Portrait orientation",
    monitoringSystem:
      overrides?.monitoringSystem ?? "Remote Monitoring System (Wi-Fi/GPRS), Web & Mobile Interface",
    netMeteringProvision:
      overrides?.netMeteringProvision ?? "System compatible and provision for Net Metering as per DISCOM norms",
    approvalsCompliance:
      overrides?.approvalsCompliance ?? "MNRE, DISCOM, CEIG, IEC/BIS Standards",
    projectCompletionTimeline: overrides?.projectCompletionTimeline ?? "8 - 10 Weeks from advance and site readiness",
    moduleWarranty: overrides?.moduleWarranty ?? "30 years linear power warranty",
    inverterWarranty: overrides?.inverterWarranty ?? "5 years from manufacturer",
    structureWindSpeed: overrides?.structureWindSpeed ?? "Wind Speed Resistance as per IS 875: up to 100 kmph",
    freeOperationMaintenance: overrides?.freeOperationMaintenance ?? "5 years free O&M typically",
    gedaRegistrationCharges: overrides?.gedaRegistrationCharges ?? 0,
    netMeteringCharges: overrides?.netMeteringCharges ?? 0,
    meterCharges: overrides?.meterCharges ?? 0,
    paymentStages: (overrides?.paymentStages ?? DEFAULT_PAYMENT_STAGES).map((entry) => ({ ...entry })),
    scopeOfWorkRows: (overrides?.scopeOfWorkRows ?? DEFAULT_SCOPE_OF_WORK_ROWS).map((entry) => ({ ...entry })),
    requiredDocuments: [...(overrides?.requiredDocuments ?? DEFAULT_REQUIRED_DOCUMENTS)],
    bankDetails: { ...(overrides?.bankDetails ?? DEFAULT_BANK_DETAILS) },
  };
};

export const normalizeQuotationDocumentData = (value: unknown): QuotationDocumentData => {
  if (!value || typeof value !== "object") {
    return createDefaultQuotationDocumentData();
  }

  const raw = value as Record<string, unknown>;
  const paymentStages = Array.isArray(raw.paymentStages)
    ? raw.paymentStages
        .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
        .map((entry) => ({
          label: asString(entry.label),
          milestone: asString(entry.milestone),
          percentage: asNumber(entry.percentage),
          remarks: asString(entry.remarks),
        }))
        .filter((entry) => entry.label)
    : undefined;

  const generationTable = Array.isArray(raw.generationTable)
    ? raw.generationTable
        .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
        .map((entry) => ({
          month: asString(entry.month),
          unitsPerDay: asNumber(entry.unitsPerDay),
          days: asNumber(entry.days),
        }))
        .filter((entry) => entry.month)
    : undefined;

  const scopeOfWorkRows = Array.isArray(raw.scopeOfWorkRows)
    ? raw.scopeOfWorkRows
        .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
        .map((entry) => ({
          srNo: asString(entry.srNo),
          workItem: asString(entry.workItem),
          responsibility: asString(entry.responsibility),
          remarks: asString(entry.remarks),
        }))
        .filter((entry) => entry.srNo || entry.workItem || entry.responsibility || entry.remarks)
    : undefined;

  const requiredDocuments = Array.isArray(raw.requiredDocuments)
    ? raw.requiredDocuments.map((entry) => asString(entry)).filter(Boolean)
    : undefined;

  const bankRaw = raw.bankDetails && typeof raw.bankDetails === "object"
    ? (raw.bankDetails as Record<string, unknown>)
    : undefined;

  return createDefaultQuotationDocumentData({
    consumerType: asString(raw.consumerType, "LT Consumer"),
    consumerNumber: asString(raw.consumerNumber),
    preparedFor: asString(raw.preparedFor),
    customerContactPerson: asString(raw.customerContactPerson),
    preparedBy: asString(raw.preparedBy, "Er. Ilyas Kaydawala"),
    validityDays: asNumber(raw.validityDays, 10),
    moduleWattage: asNumber(raw.moduleWattage, 550),
    numberOfModules: asNumber(raw.numberOfModules, 10),
    totalWatts: asNumber(raw.totalWatts, 5500),
    totalKw: asNumber(raw.totalKw, 5.5),
    systemType: asString(raw.systemType, "On Grid"),
    requiredAreaFactorSqftPerKw: asNumber(raw.requiredAreaFactorSqftPerKw, 50),
    expectedGenerationUnitsPerKw: asNumber(raw.expectedGenerationUnitsPerKw, 4.59),
    electricityTariffYear1: asNumber(raw.electricityTariffYear1, 8),
    generationTable,
    structureHeightSouth: asString(raw.structureHeightSouth, "15 ft"),
    structureHeightNorth: asString(raw.structureHeightNorth, "17 ft"),
    arrayLayout: asString(raw.arrayLayout, "South Facing, 14° Tilt, Portrait orientation"),
    monitoringSystem: asString(raw.monitoringSystem, "Remote Monitoring System (Wi-Fi/GPRS), Web & Mobile Interface"),
    netMeteringProvision: asString(raw.netMeteringProvision, "System compatible and provision for Net Metering as per DISCOM norms"),
    approvalsCompliance: asString(raw.approvalsCompliance, "MNRE, DISCOM, CEIG, IEC/BIS Standards"),
    projectCompletionTimeline: asString(raw.projectCompletionTimeline, "8 - 10 Weeks from advance and site readiness"),
    moduleWarranty: asString(raw.moduleWarranty, "30 years linear power warranty"),
    inverterWarranty: asString(raw.inverterWarranty, "5 years from manufacturer"),
    structureWindSpeed: asString(raw.structureWindSpeed, "Wind Speed Resistance as per IS 875: up to 100 kmph"),
    freeOperationMaintenance: asString(raw.freeOperationMaintenance, "5 years free O&M typically"),
    gedaRegistrationCharges: asNumber(raw.gedaRegistrationCharges, 0),
    netMeteringCharges: asNumber(raw.netMeteringCharges, 0),
    meterCharges: asNumber(raw.meterCharges, 0),
    paymentStages,
    scopeOfWorkRows,
    requiredDocuments,
    bankDetails: bankRaw
      ? {
          bankName: asString(bankRaw.bankName, DEFAULT_BANK_DETAILS.bankName),
          accountName: asString(bankRaw.accountName, DEFAULT_BANK_DETAILS.accountName),
          accountNumber: asString(bankRaw.accountNumber, DEFAULT_BANK_DETAILS.accountNumber),
          accountType: asString(bankRaw.accountType, DEFAULT_BANK_DETAILS.accountType),
          ifscCode: asString(bankRaw.ifscCode, DEFAULT_BANK_DETAILS.ifscCode),
          branch: asString(bankRaw.branch, DEFAULT_BANK_DETAILS.branch),
        }
      : undefined,
  });
};