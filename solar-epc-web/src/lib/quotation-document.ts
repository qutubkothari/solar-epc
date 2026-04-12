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
    expectedGenerationUnitsPerKw: overrides?.expectedGenerationUnitsPerKw ?? 4,
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
    paymentStages: overrides?.paymentStages ?? DEFAULT_PAYMENT_STAGES,
    requiredDocuments: overrides?.requiredDocuments ?? DEFAULT_REQUIRED_DOCUMENTS,
    bankDetails: overrides?.bankDetails ?? DEFAULT_BANK_DETAILS,
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
    expectedGenerationUnitsPerKw: asNumber(raw.expectedGenerationUnitsPerKw, 4),
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