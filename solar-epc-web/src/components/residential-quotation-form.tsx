"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ClientForm } from "@/components/client-form";
import { ModalShell } from "@/components/modal-shell";
import { SearchableSelect } from "@/components/searchable-select";
import { formatCurrency } from "@/lib/format";
import {
  createDefaultQuotationDocumentData,
  normalizeQuotationDocumentData,
  type QuotationDocumentData,
} from "@/lib/quotation-document";
import { buildRoiProjection } from "@/lib/roi-calculation";
import {
  extractWattageFromItem,
  getBoqDisplayParts,
  getBoqRowItems,
  getDefaultQuantity,
  inferSelectionUnit,
  isPercentageItem,
  matchesBoqItemType,
  
  type SolarBoqItem,
} from "@/lib/solar-boq";
import { RESIDENTIAL_BOQ_SEQUENCE, resolveResidentialBoqItemHead, getResidentialBoqRowItems } from "@/lib/residential-boq";

type Client = {
  id: string;
  name: string;
  contactName?: string;
};

type Inquiry = {
  id: string;
  title: string;
  clientId: string;
};

type BoqDraftRow = {
  id: string;
  sequence: number;
  itemHead: string;
  itemId: string;
  itemType: string;
  quantity: number;
  quantityTouched: boolean;
  fixedItemType: string | null;
  lockedItemType: boolean;
};

type BoqDraftRowSeed = Omit<BoqDraftRow, "id" | "fixedItemType" | "lockedItemType"> & {
  id?: string;
  fixedItemType?: string | null;
  lockedItemType?: boolean;
};

type ResolvedRow = {
  sequence: number;
  itemHead: string;
  itemId: string;
  itemName: string;
  quantity: number;
  selectionUnit: string;
  rate: number;
  rawRate: number;
  taxPercent: number;
  baseTotal: number;
  taxTotal: number;
  grandTotal: number;
  lineDescription: string;
  isPercentageCharge: boolean;
};

type QuotationFormTab = "overview" | "boq" | "technical" | "masters" | "payment" | "scope" | "preview";

const percentToDecimal = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return value / 100;
};

type ResidentialQuotationFormProps = {
  onClose: () => void;
  onSuccess: () => void;
  quotationId?: string;
  editVersionId?: string;
  defaultClientId?: string;
  defaultInquiryId?: string;
  defaultTitle?: string;
  defaultVersion?: string;
  defaultBrand?: string;
  initialDocumentData?: QuotationDocumentData;
  initialBoqRows?: BoqDraftRowSeed[];
  clientName?: string;
  clientContactName?: string;
  inquiryTitle?: string;
};

let boqDraftRowCounter = 0;

const nextBoqDraftRowId = () => {
  boqDraftRowCounter += 1;
  return `boq-row-${boqDraftRowCounter}`;
};

const createBoqDraftRow = (
  sequence: number,
  itemHead: string,
  seed?: Partial<BoqDraftRowSeed>
): BoqDraftRow => ({
  id: seed?.id || nextBoqDraftRowId(),
  sequence,
  itemHead,
  itemId: seed?.itemId || "",
  itemType: seed?.itemType || seed?.fixedItemType || "",
  quantity: Number(seed?.quantity || 0),
  quantityTouched: Boolean(seed?.quantityTouched),
  fixedItemType: seed?.fixedItemType || null,
  lockedItemType: Boolean(seed?.lockedItemType || seed?.fixedItemType),
});

const createRowsForSequence = (sequence: number): BoqDraftRow[] => {
  const config = RESIDENTIAL_BOQ_SEQUENCE.find((entry) => entry.sequence === sequence);
  if (!config) {
    return [];
  }

  if (config.selectionMode === "fixed" && config.fixedItemTypes && config.fixedItemTypes.length > 0) {
    return config.fixedItemTypes.map((itemType) =>
      createBoqDraftRow(config.sequence, config.itemHead, {
        itemType,
        fixedItemType: itemType,
        lockedItemType: true,
      })
    );
  }

  return [
    createBoqDraftRow(config.sequence, config.itemHead, {
      lockedItemType: config.selectionMode === "fixed",
    }),
  ];
};

const normalizeInitialBoqRows = (rows?: BoqDraftRowSeed[]): BoqDraftRow[] =>
  RESIDENTIAL_BOQ_SEQUENCE.flatMap((config) => {
    const matchingRows = (rows || []).filter((row) => row.sequence === config.sequence);

    if (matchingRows.length === 0) {
      return createRowsForSequence(config.sequence);
    }

    const normalizedRows = matchingRows.map((row) => {
      const fixedItemType =
        row.fixedItemType ||
        (config.selectionMode === "fixed"
          ? config.fixedItemTypes?.find((itemType) => matchesBoqItemType(itemType, row.itemType || "")) || null
          : null);

      return createBoqDraftRow(config.sequence, config.itemHead, {
        ...row,
        fixedItemType,
        lockedItemType: Boolean(row.lockedItemType || fixedItemType || config.selectionMode === "fixed"),
        itemType: row.itemType || fixedItemType || "",
      });
    });

    if (config.selectionMode !== "fixed") {
      return normalizedRows;
    }

    const fixedItemTypes = config.fixedItemTypes || [];
    const missingFixedRows = fixedItemTypes
      .filter((itemType) => !normalizedRows.some((row) => matchesBoqItemType(row.fixedItemType || row.itemType, itemType)))
      .map((itemType) =>
        createBoqDraftRow(config.sequence, config.itemHead, {
          itemType,
          fixedItemType: itemType,
          lockedItemType: true,
        })
      );

    return [...normalizedRows, ...missingFixedRows];
  });

const userInputClassName =
  "w-full rounded-md border border-red-300 bg-red-50 px-3 py-2 text-gray-900 placeholder:text-red-300 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100";

const calculatedCardClassName = "rounded-md border border-amber-300 bg-amber-100 p-3";

const calculatedPanelClassName = "rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900";

const readOnlyFieldClassName = "w-full rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900";

const PAYMENT_TOTAL_TOLERANCE = 0.01;

const FORM_TABS: Array<{ key: QuotationFormTab; label: string; description: string }> = [
  { key: "overview", label: "Overview", description: "Client, quotation, and proposal basics" },
  { key: "boq", label: "BOQ & Pricing", description: "Workbook BOQ builder and totals" },
  { key: "technical", label: "Technical Proposal", description: "System sizing and technical defaults" },
  { key: "masters", label: "Masters", description: "Generation settings and master inputs" },
  { key: "payment", label: "Payment & Banking", description: "Payment stages and bank details" },
  { key: "scope", label: "Scope & Documents", description: "Editable scope matrix and required documents" },
  { key: "preview", label: "Preview", description: "Final quotation summary before save" },
];

const BANK_DETAIL_FIELDS: Array<{
  key: keyof QuotationDocumentData["bankDetails"];
  label: string;
}> = [
  { key: "bankName", label: "Bank Name" },
  { key: "accountName", label: "Account Name" },
  { key: "accountNumber", label: "Account Number" },
  { key: "accountType", label: "Account Type" },
  { key: "ifscCode", label: "IFSC Code" },
  { key: "branch", label: "Branch" },
];

const OVERVIEW_REQUIRED_FIELDS = [
  { key: "preparedFor", label: "Prepared For" },
  { key: "customerContactPerson", label: "Customer Contact Person" },
  { key: "preparedBy", label: "Prepared By" },
] as const;

const isScopeSectionRow = (row: QuotationDocumentData["scopeOfWorkRows"][number]) =>
  row.responsibility === "Section";

const formatDecimal = (value: number, fractionDigits = 2) =>
  Number.isFinite(value) ? value.toLocaleString("en-IN", { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }) : "0.00";

const getItemTypeFromItem = (item?: SolarBoqItem | null) => (item ? getBoqDisplayParts(item).itemType || item.name : "");

const getWarrantySummary = (description?: string | null) => {
  const text = (description || "").replace(/\s+/g, " ").trim();
  if (!text || !/warranty/i.test(text)) {
    return "";
  }

  const warrantyParts = text
    .split("|")
    .map((part) => part.trim())
    .filter((part) => /warranty/i.test(part));

  return warrantyParts.length > 0 ? warrantyParts.join(" ; ") : text;
};

const sortClientsByName = (entries: Client[]) =>
  [...entries].sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));

export function ResidentialQuotationForm({
  onClose,
  onSuccess,
  quotationId,
  editVersionId,
  defaultClientId,
  defaultInquiryId,
  defaultTitle,
  defaultVersion,
  defaultBrand,
  initialDocumentData,
  initialBoqRows,
  clientName,
  clientContactName,
  inquiryTitle,
}: ResidentialQuotationFormProps) {
  const isEditing = Boolean(quotationId && editVersionId);
  const isNewVersion = Boolean(quotationId && !editVersionId);
  const [clients, setClients] = useState<Client[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [items, setItems] = useState<SolarBoqItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [activeTab, setActiveTab] = useState<QuotationFormTab>("overview");
  const [showClientForm, setShowClientForm] = useState(false);
  const lastAutoFilledCustomerContactRef = useRef("");
  const [formData, setFormData] = useState({
    clientId: defaultClientId || "",
    inquiryId: defaultInquiryId || "",
    title: defaultTitle || "",
    version: defaultVersion || "1.0",
    brand: defaultBrand || "",
  });
  const [documentData, setDocumentData] = useState<QuotationDocumentData>(() =>
    initialDocumentData
      ? normalizeQuotationDocumentData(initialDocumentData)
      : createDefaultQuotationDocumentData({
          preparedFor: defaultTitle || inquiryTitle || "",
          moduleWattage: 0,
          numberOfModules: 0,
          totalWatts: 0,
          totalKw: 0,
        })
  );
  const [boqRows, setBoqRows] = useState<BoqDraftRow[]>(() => normalizeInitialBoqRows(initialBoqRows));

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => setClients(data))
      .catch(() => setClients([]));
    fetch("/api/inquiries")
      .then((res) => res.json())
      .then((data) => setInquiries(data))
      .catch(() => setInquiries([]));
    fetch("/api/items")
      .then((res) => res.json())
      .then((data) => setItems(data))
      .catch(() => setItems([]));
  }, []);

  const clientOptions = clients.map((client) => ({
    value: client.id,
    label: client.name,
  }));
  const selectedClient = clients.find((entry) => entry.id === formData.clientId);
  const selectedClientContactName = selectedClient?.contactName?.trim() || clientContactName?.trim() || "";

  const inquiryOptions = inquiries
    .filter((inquiry) => !formData.clientId || inquiry.clientId === formData.clientId)
    .map((inquiry) => ({
      value: inquiry.id,
      label: inquiry.title,
    }));

  useEffect(() => {
    if (!formData.clientId || !formData.inquiryId) {
      return;
    }

    const inquiry = inquiries.find((entry) => entry.id === formData.inquiryId);
    if (inquiry && inquiry.clientId !== formData.clientId) {
      setFormData((prev) => ({ ...prev, inquiryId: "" }));
    }
  }, [formData.clientId, formData.inquiryId, inquiries]);

  useEffect(() => {
    if (!formData.inquiryId) {
      return;
    }

    const inquiry = inquiries.find((entry) => entry.id === formData.inquiryId);
    if (!inquiry) {
      return;
    }

    setFormData((prev) => {
      const nextClientId = prev.clientId || inquiry.clientId;
      const nextTitle = prev.title || inquiry.title;
      if (nextClientId === prev.clientId && nextTitle === prev.title) {
        return prev;
      }
      return {
        ...prev,
        clientId: nextClientId,
        title: nextTitle,
      };
    });
  }, [formData.inquiryId, inquiries]);

  useEffect(() => {
    if (!formData.title && !inquiryTitle) {
      return;
    }

    setDocumentData((prev) =>
      prev.preparedFor ? prev : { ...prev, preparedFor: inquiryTitle || formData.title }
    );
  }, [formData.title, inquiryTitle]);

  useEffect(() => {
    if (!selectedClientContactName) {
      return;
    }

    setDocumentData((prev) => {
      const currentCustomerContact = prev.customerContactPerson.trim();

      if (
        currentCustomerContact &&
        currentCustomerContact !== lastAutoFilledCustomerContactRef.current
      ) {
        return prev;
      }

      if (currentCustomerContact === selectedClientContactName) {
        lastAutoFilledCustomerContactRef.current = selectedClientContactName;
        return prev;
      }

      lastAutoFilledCustomerContactRef.current = selectedClientContactName;

      return {
        ...prev,
        customerContactPerson: selectedClientContactName,
      };
    });
  }, [formData.clientId, selectedClientContactName]);

  const safeModuleWattage = Math.max(documentData.moduleWattage || 0, 0);
  const numberOfModules = Math.max(Number(documentData.numberOfModules || 0), 0);
  const actualSystemWatts = numberOfModules * safeModuleWattage;
  const actualSystemKw = actualSystemWatts / 1000;

  const setDocumentField = <K extends keyof QuotationDocumentData>(
    key: K,
    value: QuotationDocumentData[K]
  ) => {
    setDocumentData((prev) => ({ ...prev, [key]: value }));
  };

  const getConfigForSequence = (sequence: number) =>
    RESIDENTIAL_BOQ_SEQUENCE.find((entry) => entry.sequence === sequence);

  useEffect(() => {
    setBoqRows((prev) => {
      let changed = false;
      const next = prev.map((row) => {
        if (!row.itemId) {
          return row;
        }

        const selectedItem = items.find((item) => item.id === row.itemId);
        if (!selectedItem) {
          return row;
        }

        const itemType = row.fixedItemType || getItemTypeFromItem(selectedItem);
        if (row.itemType === itemType) {
          return row;
        }

        changed = true;
        return {
          ...row,
          itemType,
        };
      });

      return changed ? next : prev;
    });
  }, [items]);

  useEffect(() => {
    setBoqRows((prev) => {
      let changed = false;
      const next = prev.map((row) => {
        if (!row.itemId || row.quantityTouched) {
          return row;
        }

        const selectedItem = items.find((item) => item.id === row.itemId);
        const config = getConfigForSequence(row.sequence);
        if (!selectedItem || !config) {
          return row;
        }

        const nextQty = getDefaultQuantity(config, selectedItem, {
          actualSystemWatts,
          actualSystemKw,
          numberOfModules,
        });

        if (row.quantity !== nextQty) {
          changed = true;
          return { ...row, quantity: nextQty };
        }

        return row;
      });

      return changed ? next : prev;
    });
  }, [actualSystemKw, actualSystemWatts, items, numberOfModules]);

  const resolvedRows = useMemo<ResolvedRow[]>(() => {
    const draftRows = boqRows
      .map((row) => {
        const item = items.find((entry) => entry.id === row.itemId);
        if (!item || row.quantity <= 0) {
          return null;
        }

        return {
          row,
          item,
          selectionUnit: inferSelectionUnit(item),
          rawRate: Number(item.unitPrice || 0),
          quantity: Number(row.quantity || 0),
          taxPercent: Number(item.taxPercent || 0),
          isPercentageCharge: isPercentageItem(item),
        };
      })
      .filter(Boolean) as Array<{
        row: BoqDraftRow;
        item: SolarBoqItem;
        selectionUnit: string;
        rawRate: number;
        quantity: number;
        taxPercent: number;
        isPercentageCharge: boolean;
      }>;

    const baseSubtotal = draftRows.reduce((sum, entry) => {
      if (entry.isPercentageCharge) {
        return sum;
      }
      return sum + entry.rawRate * entry.quantity;
    }, 0);

    return draftRows.map((entry) => {
      const resolvedRate = entry.isPercentageCharge
        ? baseSubtotal * percentToDecimal(entry.rawRate)
        : entry.rawRate;
      const baseTotal = resolvedRate * entry.quantity;
      const taxTotal = baseTotal * percentToDecimal(entry.taxPercent);
      const grandTotal = baseTotal + taxTotal;
      const display = getBoqDisplayParts(entry.item);
      const lineDescription = [
        entry.row.itemHead,
        display.itemType || entry.item.name,
        display.ratingOrCapacity,
        entry.selectionUnit,
        getWarrantySummary(entry.item.description),
      ]
        .filter(Boolean)
        .join(" | ");

      return {
        sequence: entry.row.sequence,
        itemHead: entry.row.itemHead,
        itemId: entry.item.id,
        itemName: entry.item.name,
        quantity: entry.quantity,
        selectionUnit: entry.selectionUnit,
        rate: resolvedRate,
        rawRate: entry.rawRate,
        taxPercent: entry.taxPercent,
        baseTotal,
        taxTotal,
        grandTotal,
        lineDescription,
        isPercentageCharge: entry.isPercentageCharge,
      };
    });
  }, [boqRows, items]);

  const subtotal = resolvedRows.reduce((sum, row) => sum + row.baseTotal, 0);
  const totalGst = resolvedRows.reduce((sum, row) => sum + row.taxTotal, 0);
  const grandTotal = subtotal + totalGst;
  const missingMandatoryBoqRows = RESIDENTIAL_BOQ_SEQUENCE.filter((config) => {
    if (!config.mandatory) {
      return false;
    }

    const rowsForSequence = boqRows.filter((row) => row.sequence === config.sequence);

    if (config.selectionMode === "fixed") {
      return rowsForSequence.some((row) => !row.itemId || row.quantity <= 0);
    }

    return !rowsForSequence.some((row) => row.itemId && row.quantity > 0);
  });
  const generationRows = documentData.generationTable.map((row) => {
    const kwh = actualSystemKw * row.unitsPerDay * row.days;
    const amount = kwh * Number(documentData.electricityTariffYear1 || 0);
    return {
      ...row,
      kwh,
      amount,
    };
  });
  const averageGenerationUnitsPerKw =
    generationRows.length > 0
      ? generationRows.reduce((sum, row) => sum + row.unitsPerDay, 0) / generationRows.length
      : 0;
  const annualGenerationKwh = generationRows.reduce((sum, row) => sum + row.kwh, 0);
  const annualGenerationSavings = generationRows.reduce((sum, row) => sum + row.amount, 0);
  const indicativeGenerationPerDay = actualSystemKw * Math.max(Math.round(averageGenerationUnitsPerKw), 0);
  const twentyFiveYearSavings = annualGenerationSavings * 25;
  const roiProjection = buildRoiProjection({
    totalKw: actualSystemKw,
    installationCost: grandTotal,
    averageDailyGenerationUnitsPerKw: Number(documentData.roiAverageDailyGenerationUnitsPerKw || 0),
    yearlyShutdownDays: Number(documentData.roiShutdownDays || 0),
    electricityTariffYear1: Number(documentData.electricityTariffYear1 || 0),
    tariffEscalationPercent: Number(documentData.roiTariffEscalationPercent || 0),
    annualPowerDegradationAfterYear1Percent: Number(documentData.roiAnnualPowerDegradationAfterYear1Percent || 0),
    annualPowerDegradationFromYear3OnwardPercent: Number(documentData.roiAnnualPowerDegradationFromYear3OnwardPercent || 0),
    operationMaintenancePercentYear1: Number(documentData.roiOperationMaintenancePercentYear1 || 0),
    operationMaintenanceEscalationPercent: Number(documentData.roiOperationMaintenanceEscalationPercent || 0),
    projectionYears: Number(documentData.roiProjectLifeYears || 0),
  });
  const roiProjectionRows = roiProjection.rows;
  const roiProjectionYears = roiProjectionRows.length;
  const roiYear1GenerationKwh = roiProjection.year1GenerationKwh;
  const roiYear1GrossSavings = roiProjection.year1GrossSavings;
  const roiOperationMaintenanceCostYear1 = roiProjection.year1OperationMaintenanceCost;
  const roiYear1NetSavings = roiProjection.year1NetSavings;
  const roiEstimatedPaybackYears = roiProjection.estimatedPaybackYears;
  const roiLifetimeNetSavings = roiProjection.lifetimeNetSavings;
  const resolvedCustomerContactPerson = documentData.customerContactPerson.trim() || selectedClientContactName;
  const missingOverviewFields = OVERVIEW_REQUIRED_FIELDS.filter(({ key }) => {
    if (key === "customerContactPerson") {
      return !resolvedCustomerContactPerson;
    }

    return !documentData[key].trim();
  });
  const invalidOverviewFields = documentData.validityDays <= 0 ? ["Validity (Days)"] : [];
  const paymentStageTotal = documentData.paymentStages.reduce((sum, stage) => sum + Number(stage.percentage || 0), 0);
  const paymentStageRows = documentData.paymentStages.map((stage, index) => ({
    index,
    stage,
    value: grandTotal * percentToDecimal(Number(stage.percentage || 0)),
  }));
  const incompletePaymentStages = documentData.paymentStages
    .map((stage, index) => ({
      index,
      stage,
      isIncomplete:
        !stage.label.trim() ||
        !stage.milestone.trim() ||
        !stage.remarks.trim() ||
        Number(stage.percentage || 0) <= 0,
    }))
    .filter((entry) => entry.isIncomplete);
  const hasInvalidPaymentTotal = Math.abs(paymentStageTotal - 100) > PAYMENT_TOTAL_TOLERANCE;
  const isPaymentTotalBalanced = !hasInvalidPaymentTotal;
  const missingBankFields = BANK_DETAIL_FIELDS.filter(({ key }) => !documentData.bankDetails[key].trim());
  const incompleteScopeRows = documentData.scopeOfWorkRows
    .map((row, index) => ({
      index,
      row,
      isIncomplete:
        !isScopeSectionRow(row) &&
        (!row.srNo.trim() || !row.workItem.trim() || !row.responsibility.trim() || !row.remarks.trim()),
    }))
    .filter((entry) => entry.isIncomplete);
  const missingRequiredDocuments = documentData.requiredDocuments.length === 0;
  const totalValidationIssueCount =
    missingOverviewFields.length +
    invalidOverviewFields.length +
    missingMandatoryBoqRows.length +
    incompletePaymentStages.length +
    incompleteScopeRows.length +
    missingBankFields.length +
    (hasInvalidPaymentTotal ? 1 : 0) +
    (missingRequiredDocuments ? 1 : 0);
  const hasValidationIssues =
    hasInvalidPaymentTotal ||
    missingOverviewFields.length > 0 ||
    invalidOverviewFields.length > 0 ||
    missingMandatoryBoqRows.length > 0 ||
    incompletePaymentStages.length > 0 ||
    incompleteScopeRows.length > 0 ||
    missingBankFields.length > 0 ||
    missingRequiredDocuments;
  const activeTabIndex = FORM_TABS.findIndex((tab) => tab.key === activeTab);
  const previousTab = activeTabIndex > 0 ? FORM_TABS[activeTabIndex - 1] : null;
  const nextTab = activeTabIndex < FORM_TABS.length - 1 ? FORM_TABS[activeTabIndex + 1] : null;
  const selectedClientLabel = clientName || selectedClient?.name || "Not selected";
  const selectedInquiryLabel = inquiryTitle || inquiries.find((entry) => entry.id === formData.inquiryId)?.title || "Not linked";
  const validationErrorMessage = (() => {
    if (!formData.clientId) {
      return "Please select a client";
    }

    if (!formData.title) {
      return "Please enter a quotation title";
    }

    if (missingOverviewFields.length > 0 || invalidOverviewFields.length > 0) {
      const issueLabels = [...missingOverviewFields.map((field) => field.label), ...invalidOverviewFields];
      return `Complete the overview details before saving. Missing or invalid: ${issueLabels.join(", ")}.`;
    }

    if (missingMandatoryBoqRows.length > 0) {
      return `Complete all mandatory BOQ selections before saving. Missing: ${missingMandatoryBoqRows.map((row) => row.itemHead).join(", ")}.`;
    }

    if (resolvedRows.length === 0) {
      return "Please select at least one BOQ item";
    }

    if (hasInvalidPaymentTotal) {
      return `Payment stages must total 100%. Current total is ${paymentStageTotal.toFixed(2)}%.`;
    }

    if (incompletePaymentStages.length > 0) {
      return `Complete all payment stage fields before saving. ${incompletePaymentStages.length} stage(s) are incomplete.`;
    }

    if (missingBankFields.length > 0) {
      return `Complete all bank details before saving. Missing: ${missingBankFields.map((field) => field.label).join(", ")}.`;
    }

    if (incompleteScopeRows.length > 0) {
      return `Complete all scope rows before saving. ${incompleteScopeRows.length} row(s) are incomplete.`;
    }

    if (missingRequiredDocuments) {
      return "Add at least one required document before saving.";
    }

    return null;
  })();
  const getTabIssueCount = (tabKey: QuotationFormTab) => {
    if (tabKey === "overview") {
      return missingOverviewFields.length + invalidOverviewFields.length;
    }

    if (tabKey === "boq") {
      return missingMandatoryBoqRows.length;
    }

    if (tabKey === "payment") {
      return incompletePaymentStages.length + missingBankFields.length + (hasInvalidPaymentTotal ? 1 : 0);
    }

    if (tabKey === "scope") {
      return incompleteScopeRows.length + (missingRequiredDocuments ? 1 : 0);
    }

    if (tabKey === "preview") {
      return totalValidationIssueCount;
    }

    return 0;
  };

  const solarSystemConfigurationPanel = (
    <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
      <h3 className="mb-4 text-lg font-semibold text-blue-900">Solar System Configuration</h3>
      <div className="grid gap-4 md:grid-cols-4 mb-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Meter Phase</label>
          <select
            value={documentData.meterPhase}
            onChange={(e) => setDocumentField("meterPhase", e.target.value)}
            className={userInputClassName}
          >
            <option value="Single Phase">Single Phase</option>
            <option value="Three Phase">Three Phase</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">DISCOM</label>
          <select
            value={documentData.discom}
            onChange={(e) => setDocumentField("discom", e.target.value)}
            className={userInputClassName}
          >
            <option value="MGVCL">MGVCL</option>
            <option value="UGVCL">UGVCL</option>
            <option value="PGVCL">PGVCL</option>
            <option value="DGVCL">DGVCL</option>
            <option value="TORRENT">TORRENT</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Plant Type</label>
          <select
            value={documentData.plantType}
            onChange={(e) => setDocumentField("plantType", e.target.value)}
            className={userInputClassName}
          >
            <option value="ON GRID">ON GRID</option>
            <option value="OFF GRID">OFF GRID</option>
            <option value="HYBRID">HYBRID</option>
          </select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Module Wattage (W)</label>
          <input
            type="number"
            min="0"
            value={documentData.moduleWattage > 0 ? documentData.moduleWattage : ""}
            onChange={(event) =>
              setDocumentField("moduleWattage", Number(event.target.value || 0))
            }
            className={userInputClassName}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">No. of Modules</label>
          <input
            type="number"
            min="0"
            value={documentData.numberOfModules > 0 ? documentData.numberOfModules : ""}
            onChange={(event) =>
              setDocumentField("numberOfModules", Number(event.target.value || 0))
            }
            className={userInputClassName}
          />
        </div>
        <div className={calculatedCardClassName}>
          <div className="text-xs font-medium uppercase tracking-wide text-amber-700">Total WP</div>
          <div className="text-2xl font-bold text-amber-900">{actualSystemWatts.toLocaleString()}</div>
          <div className="mt-1 text-[11px] text-amber-700">Module Wattage x No. of Modules</div>
        </div>
        <div className={calculatedCardClassName}>
          <div className="text-xs font-medium uppercase tracking-wide text-amber-700">Total KW</div>
          <div className="text-2xl font-bold text-amber-900">{actualSystemKw.toFixed(2)}</div>
          <div className="mt-1 text-[11px] text-amber-700">Total WP / 1000</div>
        </div>
      </div>
      <div className={`mt-4 ${calculatedPanelClassName}`}>
        <strong>System Summary:</strong> {actualSystemKw.toFixed(2)} kWp ({numberOfModules} x {documentData.moduleWattage}W = {actualSystemWatts.toLocaleString()}W)
      </div>
    </div>
  );

  const generationSettingsPanel = (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-rose-900">Generation Settings</h3>
          <p className="text-xs text-rose-800">Monthly generation settings from Generation Table.docx. Red cells are inputs, amber values are calculated.</p>
        </div>
        <div className="w-full max-w-[220px]">
          <label className="mb-1 block text-sm font-medium text-gray-700">Electricity Tariff - Year 1</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={documentData.electricityTariffYear1}
            onChange={(event) => setDocumentField("electricityTariffYear1", Number(event.target.value || 0))}
            className={userInputClassName}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-rose-200 bg-white">
        <div className="max-h-[420px] overflow-auto">
          <table className="min-w-[760px] table-fixed divide-y divide-rose-100">
            <thead className="sticky top-0 bg-rose-50 text-[11px] uppercase tracking-wide text-rose-900">
              <tr>
                <th className="w-24 px-3 py-2 text-left">Month</th>
                <th className="w-28 px-3 py-2 text-right">Unit / Day</th>
                <th className="w-20 px-3 py-2 text-right">Days</th>
                <th className="w-32 px-3 py-2 text-right">kWh</th>
                <th className="w-36 px-3 py-2 text-right">INR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-100 text-sm">
              {generationRows.map((row, index) => (
                <tr key={row.month}>
                  <td className="px-3 py-2 font-medium text-slate-900">{row.month}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.unitsPerDay}
                      onChange={(event) => updateGenerationRow(index, event.target.value)}
                      className="w-full rounded-md border border-red-300 bg-red-50 px-3 py-2 text-right text-sm text-gray-900"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">{row.days}</div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">{formatDecimal(row.kwh)}</div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">{formatCurrency(row.amount)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-amber-50 text-sm font-semibold text-amber-950">
              <tr>
                <td className="px-3 py-3">Total / Avg</td>
                <td className="px-3 py-3 text-right">{formatDecimal(averageGenerationUnitsPerKw)}</td>
                <td className="px-3 py-3 text-right">365</td>
                <td className="px-3 py-3 text-right">{formatDecimal(annualGenerationKwh)}</td>
                <td className="px-3 py-3 text-right">{formatCurrency(annualGenerationSavings)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className={calculatedCardClassName}>
          <div className="text-xs font-medium uppercase tracking-wide text-amber-700">Solar Roof Top Size</div>
          <div className="text-2xl font-bold text-amber-900">{actualSystemKw.toFixed(2)} kW</div>
          <div className="mt-1 text-[11px] text-amber-700">Calculated from module count and wattage</div>
        </div>
        <div className={calculatedCardClassName}>
          <div className="text-xs font-medium uppercase tracking-wide text-amber-700">Generation / Day</div>
          <div className="text-2xl font-bold text-amber-900">{formatDecimal(indicativeGenerationPerDay, 0)} Unit</div>
          <div className="mt-1 text-[11px] text-amber-700">System size x rounded average units/day</div>
        </div>
        <div className={calculatedCardClassName}>
          <div className="text-xs font-medium uppercase tracking-wide text-amber-700">Yearly Saving</div>
          <div className="text-2xl font-bold text-amber-900">{formatCurrency(annualGenerationSavings)}</div>
          <div className="mt-1 text-[11px] text-amber-700">Sum of monthly savings</div>
        </div>
        <div className={calculatedCardClassName}>
          <div className="text-xs font-medium uppercase tracking-wide text-amber-700">1st Year Generation</div>
          <div className="text-2xl font-bold text-amber-900">{formatDecimal(annualGenerationKwh, 0)} kWh</div>
          <div className="mt-1 text-[11px] text-amber-700">Sum of monthly generation</div>
        </div>
        <div className={calculatedCardClassName}>
          <div className="text-xs font-medium uppercase tracking-wide text-amber-700">25 Year Saving</div>
          <div className="text-2xl font-bold text-amber-900">{formatCurrency(twentyFiveYearSavings)}</div>
          <div className="mt-1 text-[11px] text-amber-700">Yearly saving x 25</div>
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium text-gray-700">Generation Disclaimer / Note</label>
        <textarea
          value={documentData.generationDisclaimer}
          onChange={(event) => setDocumentField("generationDisclaimer", event.target.value)}
          rows={2}
          className={userInputClassName}
        />
      </div>
    </div>
  );

  const handleSelectItemType = (rowId: string, itemType: string) => {
    const targetRow = boqRows.find((row) => row.id === rowId);
    const config = targetRow ? getConfigForSequence(targetRow.sequence) : undefined;
    const selectedItem = config
      ? getResidentialBoqRowItems(items, config).find((item) => matchesBoqItemType(getItemTypeFromItem(item), itemType))
      : undefined;

    setBoqRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        if (!selectedItem || !config) {
          return { ...row, itemType, itemId: "", quantity: 0, quantityTouched: false };
        }

        const nextQty = getDefaultQuantity(config, selectedItem, {
          actualSystemWatts,
          actualSystemKw,
          numberOfModules,
        });

        return {
          ...row,
          itemType,
          itemId: selectedItem.id,
          quantity: row.quantityTouched && row.itemId ? row.quantity : nextQty,
          quantityTouched: false,
        };
      })
    );

    if (targetRow?.sequence === 1 && selectedItem) {
      const wattage = extractWattageFromItem(selectedItem);
      if (wattage) {
        setDocumentField("moduleWattage", wattage);
      }
    }
  };

  const handleSelectRating = (rowId: string, itemId: string) => {
    const targetRow = boqRows.find((row) => row.id === rowId);
    const config = targetRow ? getConfigForSequence(targetRow.sequence) : undefined;
    const selectedItem = items.find((item) => item.id === itemId);

    setBoqRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        if (!selectedItem || !config) {
          return { ...row, itemId, quantity: 0, quantityTouched: false };
        }

        const nextQty = getDefaultQuantity(config, selectedItem, {
          actualSystemWatts,
          actualSystemKw,
          numberOfModules,
        });

        return {
          ...row,
          itemType: getItemTypeFromItem(selectedItem),
          itemId,
          quantity: row.quantityTouched && row.itemId ? row.quantity : nextQty,
          quantityTouched: false,
        };
      })
    );

    if (targetRow?.sequence === 1 && selectedItem) {
      const wattage = extractWattageFromItem(selectedItem);
      if (wattage) {
        setDocumentField("moduleWattage", wattage);
      }
    }
  };

  const handleQuantityChange = (rowId: string, value: string) => {
    const quantity = Number(value || 0);
    setBoqRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              quantity,
              quantityTouched: true,
            }
          : row
      )
    );
  };

  const addBoqRow = (sequence: number) => {
    const config = getConfigForSequence(sequence);
    if (!config || (config.selectionMode !== "multiple" && !config.allowAdditional)) {
      return;
    }

    setBoqRows((prev) => {
      const insertAt = prev.reduce((lastIndex, row, index) => (row.sequence === sequence ? index : lastIndex), -1);
      const nextRow = createBoqDraftRow(config.sequence, config.itemHead);

      return [
        ...prev.slice(0, insertAt + 1),
        nextRow,
        ...prev.slice(insertAt + 1),
      ];
    });
  };

  const removeBoqRow = (rowId: string) => {
    setBoqRows((prev) => {
      const row = prev.find((entry) => entry.id === rowId);
      if (!row) {
        return prev;
      }

      const config = getConfigForSequence(row.sequence);
      const isMultiple = config?.selectionMode === "multiple";
      const isAdditional = config?.allowAdditional === true && !row.lockedItemType;
      if (!config || (!isMultiple && !isAdditional)) {
        return prev;
      }

      const rowsForSequence = prev.filter((entry) => entry.sequence === row.sequence);
      if (isMultiple && rowsForSequence.length <= 1) {
        return prev.map((entry) =>
          entry.id === rowId
            ? { ...entry, itemId: "", itemType: "", quantity: 0, quantityTouched: false }
            : entry
        );
      }

      return prev.filter((entry) => entry.id !== rowId);
    });
  };

  const updatePaymentStage = (
    index: number,
    key: "label" | "milestone" | "percentage" | "remarks",
    value: string
  ) => {
    setDocumentData((prev) => ({
      ...prev,
      paymentStages: prev.paymentStages.map((stage, stageIndex) =>
        stageIndex === index
          ? {
              ...stage,
              [key]: key === "percentage" ? Number(value || 0) : value,
            }
          : stage
      ),
    }));
  };

  const addPaymentStage = () => {
    setDocumentData((prev) => ({
      ...prev,
      paymentStages: [
        ...prev.paymentStages,
        {
          label: `Stage ${prev.paymentStages.length + 1}`,
          milestone: "",
          percentage: 0,
          remarks: "",
        },
      ],
    }));
  };

  const removePaymentStage = (index: number) => {
    setDocumentData((prev) => ({
      ...prev,
      paymentStages: prev.paymentStages.filter((_, stageIndex) => stageIndex !== index),
    }));
  };

  const updateBankField = (key: keyof QuotationDocumentData["bankDetails"], value: string) => {
    setDocumentData((prev) => ({
      ...prev,
      bankDetails: {
        ...prev.bankDetails,
        [key]: value,
      },
    }));
  };

  const updateRequiredDocuments = (value: string) => {
    setDocumentData((prev) => ({
      ...prev,
      requiredDocuments: value
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    }));
  };

  const updateScopeRow = (
    index: number,
    key: "srNo" | "workItem" | "responsibility" | "remarks",
    value: string
  ) => {
    setDocumentData((prev) => ({
      ...prev,
      scopeOfWorkRows: prev.scopeOfWorkRows.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [key]: value,
            }
          : row
      ),
    }));
  };

  const addScopeRow = () => {
    setDocumentData((prev) => ({
      ...prev,
      scopeOfWorkRows: [
        ...prev.scopeOfWorkRows,
        {
          srNo: `${prev.scopeOfWorkRows.length + 1}`,
          workItem: "",
          responsibility: "",
          remarks: "",
        },
      ],
    }));
  };

  const removeScopeRow = (index: number) => {
    setDocumentData((prev) => ({
      ...prev,
      scopeOfWorkRows: prev.scopeOfWorkRows.filter((_, rowIndex) => rowIndex !== index),
    }));
  };

  const updateGenerationRow = (index: number, value: string) => {
    setDocumentData((prev) => ({
      ...prev,
      generationTable: prev.generationTable.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              unitsPerDay: Number(value || 0),
            }
          : row
      ),
    }));
  };

  const updateInstallationProcedureStep = (
    index: number,
    key: "step" | "procedure" | "description" | "timePeriod",
    value: string
  ) => {
    setDocumentData((prev) => ({
      ...prev,
      installationProcedureSteps: prev.installationProcedureSteps.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [key]: value,
            }
          : row
      ),
    }));
  };

  const addInstallationProcedureStep = () => {
    setDocumentData((prev) => ({
      ...prev,
      installationProcedureSteps: [
        ...prev.installationProcedureSteps,
        {
          step: `Step-${prev.installationProcedureSteps.length + 1}`,
          procedure: "",
          description: "",
          timePeriod: "",
        },
      ],
    }));
  };

  const removeInstallationProcedureStep = (index: number) => {
    setDocumentData((prev) => ({
      ...prev,
      installationProcedureSteps: prev.installationProcedureSteps.filter((_, rowIndex) => rowIndex !== index),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    setErrorMessage(null);

    if (!formData.clientId) {
      setActiveTab("overview");
      return;
    }

    if (!formData.title) {
      setActiveTab("overview");
      return;
    }

    if (missingOverviewFields.length > 0 || invalidOverviewFields.length > 0) {
      setActiveTab("overview");
      return;
    }

    if (missingMandatoryBoqRows.length > 0) {
      setActiveTab("boq");
      return;
    }

    if (resolvedRows.length === 0) {
      setActiveTab("boq");
      return;
    }

    if (hasInvalidPaymentTotal) {
      setActiveTab("payment");
      return;
    }

    if (incompletePaymentStages.length > 0) {
      setActiveTab("payment");
      return;
    }

    if (missingBankFields.length > 0) {
      setActiveTab("payment");
      return;
    }

    if (incompleteScopeRows.length > 0) {
      setActiveTab("scope");
      return;
    }

    if (missingRequiredDocuments) {
      setActiveTab("scope");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        clientId: formData.clientId,
        inquiryId: formData.inquiryId || null,
        title: formData.title,
        version: formData.version,
        brand: formData.brand,
        systemCapacityKw: actualSystemKw,
        moduleWattage: documentData.moduleWattage,
        numberOfModules,
        documentData: {
          ...documentData,
          preparedFor: documentData.preparedFor || formData.title,
          customerContactPerson: resolvedCustomerContactPerson,
          expectedGenerationUnitsPerKw: Number(averageGenerationUnitsPerKw.toFixed(2)),
          moduleWattage: documentData.moduleWattage,
          numberOfModules,
          totalWatts: actualSystemWatts,
          totalKw: Number(actualSystemKw.toFixed(2)),
        },
        items: resolvedRows.map((row) => ({
          itemId: row.itemId,
          quantity: row.quantity,
          rate: row.rate,
          taxPercent: row.taxPercent,
          marginPercent: 0,
          description: row.lineDescription,
        })),
      };

      const url = isEditing
        ? `/api/quotations/${quotationId}`
        : quotationId
          ? `/api/quotations/${quotationId}/versions`
          : "/api/quotations";
      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEditing ? { ...payload, versionId: editVersionId } : payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || (isEditing ? "Failed to update quotation" : "Failed to create quotation"));
      }

      onSuccess();
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : isEditing ? "Failed to update quotation" : "Failed to create quotation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <ModalShell
      onClose={onClose}
      title={isEditing ? `Edit Quotation ${formData.version}` : isNewVersion ? `New Version ${formData.version}` : "New Solar EPC Quotation"}
      subtitle={
        isEditing
          ? "Update the current quotation BOQ and proposal details"
          : isNewVersion && clientName
            ? `For ${clientName}`
            : "BOQ sequence aligned with the shared workbook"
      }
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-wrap gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-xs text-gray-700">
          <div className="inline-flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-sm border border-red-300 bg-red-100" />
            <span>User input fields</span>
          </div>
          <div className="inline-flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-sm border border-amber-300 bg-amber-100" />
            <span>Calculated fields</span>
          </div>
        </div>

        <div className="grid gap-2 rounded-xl border border-solar-border bg-white p-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {FORM_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const issueCount = getTabIssueCount(tab.key);
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  isActive
                    ? "border-solar-amber bg-solar-sand shadow-sm"
                    : issueCount > 0
                      ? "border-red-200 bg-red-50 hover:border-red-300"
                      : "border-solar-border bg-white hover:border-solar-amber/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${isActive ? "bg-solar-amber text-white" : "bg-solar-sand text-solar-ink"}`}>
                    {FORM_TABS.findIndex((entry) => entry.key === tab.key) + 1}
                  </span>
                  <div className="text-sm font-semibold text-solar-ink">{tab.label}</div>
                  {issueCount > 0 && (
                    <span className="ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                      {issueCount}
                    </span>
                  )}
                </div>
                <div className="mt-1 hidden text-[11px] text-solar-muted xl:block">{tab.description}</div>
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 rounded-xl border border-solar-border bg-solar-sand/40 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-solar-muted">Title</div>
            <div className="text-sm font-semibold text-solar-ink">{formData.title || "New quotation"}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-solar-muted">Client</div>
            <div className="text-sm font-semibold text-solar-ink">{selectedClientLabel}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-solar-muted">System Size</div>
            <div className="text-sm font-semibold text-solar-ink">{actualSystemKw.toFixed(2)} kWp</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-solar-muted">Current Total</div>
            <div className="text-sm font-semibold text-solar-ink">{formatCurrency(grandTotal)}</div>
          </div>
        </div>

        {(errorMessage || (hasAttemptedSubmit && validationErrorMessage)) && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">{errorMessage || validationErrorMessage}</p>
          </div>
        )}

        {isNewVersion && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-900">Creating version {formData.version}</p>
            <p className="text-xs text-amber-700">The same BOQ layout will be saved as a new quotation version.</p>
          </div>
        )}

        {activeTab === "overview" && (
        <>
        {(missingOverviewFields.length > 0 || invalidOverviewFields.length > 0) && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            Complete the required overview details before saving. Missing or invalid: {[...missingOverviewFields.map((field) => field.label), ...invalidOverviewFields].join(", ")}.
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Client <span className="text-red-500">*</span>
            </label>
            {isNewVersion || isEditing ? (
              <div className={readOnlyFieldClassName}>
                {clientName || "Loading..."}
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <SearchableSelect
                    options={clientOptions}
                    value={formData.clientId}
                    onChange={(value) => setFormData((prev) => ({ ...prev, clientId: value }))}
                    placeholder="Select client..."
                    triggerClassName="border-red-300 bg-red-50"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowClientForm(true)}
                  className="rounded-md border border-solar-border bg-white px-3 py-2 text-sm font-medium text-solar-ink"
                >
                  Add New Customer
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Inquiry / Project</label>
            {isNewVersion ? (
              <div className={readOnlyFieldClassName}>
                {inquiryTitle || "Not linked"}
              </div>
            ) : (
              <SearchableSelect
                options={inquiryOptions}
                value={formData.inquiryId}
                onChange={(value) => setFormData((prev) => ({ ...prev, inquiryId: value }))}
                placeholder="Select inquiry..."
                triggerClassName="border-red-300 bg-red-50"
              />
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {isNewVersion ? "Quotation" : "Quotation Title"} <span className="text-red-500">*</span>
            </label>
            {isNewVersion ? (
              <div className={readOnlyFieldClassName}>
                {formData.title}
              </div>
            ) : (
              <input
                type="text"
                value={formData.title}
                onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="e.g., Roof Top Solar System"
                className={userInputClassName}
              />
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Version</label>
            {isEditing ? (
              <div className={readOnlyFieldClassName}>{formData.version}</div>
            ) : (
              <input
                type="text"
                value={formData.version}
                onChange={(event) => setFormData((prev) => ({ ...prev, version: event.target.value }))}
                className={userInputClassName}
              />
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Offer Label / Brand</label>
            <input
              type="text"
              value={formData.brand}
              onChange={(event) => setFormData((prev) => ({ ...prev, brand: event.target.value }))}
              placeholder="e.g., Sungrow + Pahal"
              className={userInputClassName}
            />
          </div>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="mb-4 text-lg font-semibold text-emerald-900">Proposal Details</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Prepared For</label>
              <input
                type="text"
                value={documentData.preparedFor}
                onChange={(event) => setDocumentField("preparedFor", event.target.value)}
                placeholder="Plant / project / prepared for"
                className={`${userInputClassName} ${missingOverviewFields.some((field) => field.key === "preparedFor") ? "ring-2 ring-red-300" : ""}`}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Customer Contact Person</label>
              <input
                type="text"
                value={documentData.customerContactPerson}
                onChange={(event) => setDocumentField("customerContactPerson", event.target.value)}
                placeholder={selectedClientContactName ? `Saved client contact: ${selectedClientContactName}` : "Customer contact person"}
                className={`${userInputClassName} ${missingOverviewFields.some((field) => field.key === "customerContactPerson") ? "ring-2 ring-red-300" : ""}`}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Type of Consumer</label>
              <select
                value={documentData.consumerType}
                onChange={(event) => setDocumentField("consumerType", event.target.value)}
                className={userInputClassName}
              >
                <option value="LT Consumer">LT Consumer</option>
                <option value="HT Consumer">HT Consumer</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Consumer Number</label>
              <input
                type="text"
                value={documentData.consumerNumber}
                onChange={(event) => setDocumentField("consumerNumber", event.target.value)}
                placeholder="Consumer number"
                className={userInputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Prepared By</label>
              <input
                type="text"
                value={documentData.preparedBy}
                onChange={(event) => setDocumentField("preparedBy", event.target.value)}
                className={`${userInputClassName} ${missingOverviewFields.some((field) => field.key === "preparedBy") ? "ring-2 ring-red-300" : ""}`}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Validity (Days)</label>
              <input
                type="number"
                min="1"
                value={documentData.validityDays}
                onChange={(event) => setDocumentField("validityDays", Number(event.target.value || 0))}
                className={`${userInputClassName} ${invalidOverviewFields.includes("Validity (Days)") ? "ring-2 ring-red-300" : ""}`}
              />
            </div>
          </div>
        </div>
        </>
        )}

        {activeTab === "technical" && (
        <>
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
          <h3 className="mb-4 text-lg font-semibold text-violet-900">Technical & Commercial Defaults</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">System Type</label>
              <input
                type="text"
                value={documentData.systemType}
                onChange={(event) => setDocumentField("systemType", event.target.value)}
                className={userInputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Project Completion Timeline</label>
              <input
                type="text"
                value={documentData.projectCompletionTimeline}
                onChange={(event) => setDocumentField("projectCompletionTimeline", event.target.value)}
                className={userInputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Required Area Factor (sqft / kW)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={documentData.requiredAreaFactorSqftPerKw}
                onChange={(event) => setDocumentField("requiredAreaFactorSqftPerKw", Number(event.target.value || 0))}
                className={userInputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Average Generation Units / kW / Day</label>
              <div className={readOnlyFieldClassName}>{formatDecimal(averageGenerationUnitsPerKw)}</div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Structure Height South</label>
              <input
                type="text"
                value={documentData.structureHeightSouth}
                onChange={(event) => setDocumentField("structureHeightSouth", event.target.value)}
                className={userInputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Structure Height North</label>
              <input
                type="text"
                value={documentData.structureHeightNorth}
                onChange={(event) => setDocumentField("structureHeightNorth", event.target.value)}
                className={userInputClassName}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Array Layout</label>
              <input
                type="text"
                value={documentData.arrayLayout}
                onChange={(event) => setDocumentField("arrayLayout", event.target.value)}
                className={userInputClassName}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Monitoring System</label>
              <input
                type="text"
                value={documentData.monitoringSystem}
                onChange={(event) => setDocumentField("monitoringSystem", event.target.value)}
                className={userInputClassName}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Approvals & Compliance</label>
              <input
                type="text"
                value={documentData.approvalsCompliance}
                onChange={(event) => setDocumentField("approvalsCompliance", event.target.value)}
                className={userInputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">GEDA / Registration Charges</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={documentData.gedaRegistrationCharges}
                onChange={(event) => setDocumentField("gedaRegistrationCharges", Number(event.target.value || 0))}
                className={userInputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Net Metering Charges</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={documentData.netMeteringCharges}
                onChange={(event) => setDocumentField("netMeteringCharges", Number(event.target.value || 0))}
                className={userInputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Meter / Modem Charges</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={documentData.meterCharges}
                onChange={(event) => setDocumentField("meterCharges", Number(event.target.value || 0))}
                className={userInputClassName}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Net Metering Provision</label>
              <textarea
                value={documentData.netMeteringProvision}
                onChange={(event) => setDocumentField("netMeteringProvision", event.target.value)}
                rows={2}
                className={userInputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Module Warranty</label>
              <input
                type="text"
                value={documentData.moduleWarranty}
                onChange={(event) => setDocumentField("moduleWarranty", event.target.value)}
                className={userInputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Inverter Warranty</label>
              <input
                type="text"
                value={documentData.inverterWarranty}
                onChange={(event) => setDocumentField("inverterWarranty", event.target.value)}
                className={userInputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Structure Wind Speed</label>
              <input
                type="text"
                value={documentData.structureWindSpeed}
                onChange={(event) => setDocumentField("structureWindSpeed", event.target.value)}
                className={userInputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Free Operation & Maintenance</label>
              <input
                type="text"
                value={documentData.freeOperationMaintenance}
                onChange={(event) => setDocumentField("freeOperationMaintenance", event.target.value)}
                className={userInputClassName}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-emerald-900">Solar Plant Installation : Procedure &amp; Time frame</h3>
              <p className="text-xs text-emerald-800">Editable timeline from Quotation format - 5.docx.</p>
            </div>
            <button
              type="button"
              onClick={addInstallationProcedureStep}
              className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-900"
            >
              Add Step
            </button>
          </div>

          <div className="overflow-hidden rounded-lg border border-emerald-200 bg-white">
            <div className="max-h-[420px] overflow-auto">
              <table className="min-w-[980px] table-fixed divide-y divide-emerald-100">
                <thead className="sticky top-0 bg-emerald-50 text-[11px] uppercase tracking-wide text-emerald-900">
                  <tr>
                    <th className="w-28 px-3 py-2 text-left">Step</th>
                    <th className="w-48 px-3 py-2 text-left">Procedure</th>
                    <th className="px-3 py-2 text-left">Description</th>
                    <th className="w-44 px-3 py-2 text-left">Time Period</th>
                    <th className="w-16 px-3 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-100 text-sm">
                  {documentData.installationProcedureSteps.map((row, index) => (
                    <tr key={`${row.step}-${index}`}>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.step}
                          onChange={(event) => updateInstallationProcedureStep(index, "step", event.target.value)}
                          className={userInputClassName}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.procedure}
                          onChange={(event) => updateInstallationProcedureStep(index, "procedure", event.target.value)}
                          className={userInputClassName}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <textarea
                          value={row.description}
                          onChange={(event) => updateInstallationProcedureStep(index, "description", event.target.value)}
                          rows={2}
                          className={userInputClassName}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.timePeriod}
                          onChange={(event) => updateInstallationProcedureStep(index, "timePeriod", event.target.value)}
                          className={userInputClassName}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeInstallationProcedureStep(index)}
                          className="rounded-md border border-red-200 bg-red-50 px-2 py-2 text-xs font-semibold text-red-700"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">Procedure Note</label>
            <textarea
              value={documentData.installationProcedureNote}
              onChange={(event) => setDocumentField("installationProcedureNote", event.target.value)}
              rows={3}
              className={userInputClassName}
            />
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-amber-900">Solar Plant ROI Calculator</h3>
            <p className="text-xs text-amber-800">Input parameters from Format 5 with live calculated payback and lifetime savings.</p>
          </div>

          <div className="overflow-hidden rounded-lg border border-amber-200 bg-white">
            <div className="max-h-[460px] overflow-auto">
              <table className="min-w-[900px] table-fixed divide-y divide-amber-100 text-sm">
                <thead className="bg-amber-50 text-[11px] uppercase tracking-wide text-amber-900">
                  <tr>
                    <th className="w-64 px-3 py-2 text-left">Parameter</th>
                    <th className="w-28 px-3 py-2 text-left">Unit</th>
                    <th className="w-56 px-3 py-2 text-left">Value</th>
                    <th className="px-3 py-2 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-900">Project Capacity</td>
                    <td className="px-3 py-2 text-slate-700">kW</td>
                    <td className="px-3 py-2"><div className={readOnlyFieldClassName}>{formatDecimal(actualSystemKw)}</div></td>
                    <td className="px-3 py-2 text-slate-600">Size of plant</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-900">Total Cost</td>
                    <td className="px-3 py-2 text-slate-700">INR</td>
                    <td className="px-3 py-2"><div className={readOnlyFieldClassName}>{formatCurrency(grandTotal)}</div></td>
                    <td className="px-3 py-2 text-slate-600">Total EPC cost</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-900">Average Daily Generation</td>
                    <td className="px-3 py-2 text-slate-700">kWh / kWp / day</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={documentData.roiAverageDailyGenerationUnitsPerKw}
                        onChange={(event) => setDocumentField("roiAverageDailyGenerationUnitsPerKw", Number(event.target.value || 0))}
                        className={userInputClassName}
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-600">Based on site data</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-900">Average Yearly Shutdown</td>
                    <td className="px-3 py-2 text-slate-700">Days</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={documentData.roiShutdownDays}
                        onChange={(event) => setDocumentField("roiShutdownDays", Number(event.target.value || 0))}
                        className={userInputClassName}
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-600">Plant or grid-side maintenance downtime</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-900">Electricity Tariff (Year 1)</td>
                    <td className="px-3 py-2 text-slate-700">INR / kWh</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={documentData.electricityTariffYear1}
                        onChange={(event) => setDocumentField("electricityTariffYear1", Number(event.target.value || 0))}
                        className={userInputClassName}
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-600">Current grid rate</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-900">Tariff Escalation</td>
                    <td className="px-3 py-2 text-slate-700">%</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={documentData.roiTariffEscalationPercent}
                        onChange={(event) => setDocumentField("roiTariffEscalationPercent", Number(event.target.value || 0))}
                        className={userInputClassName}
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-600">Expected yearly increase</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-900">Annual Power Degradation (After 1st Year)</td>
                    <td className="px-3 py-2 text-slate-700">%</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={documentData.roiAnnualPowerDegradationAfterYear1Percent}
                        onChange={(event) => setDocumentField("roiAnnualPowerDegradationAfterYear1Percent", Number(event.target.value || 0))}
                        className={userInputClassName}
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-600">Module efficiency drop after Year 1</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-900">Annual Power Degradation (From 3rd Year onward)</td>
                    <td className="px-3 py-2 text-slate-700">%</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={documentData.roiAnnualPowerDegradationFromYear3OnwardPercent}
                        onChange={(event) => setDocumentField("roiAnnualPowerDegradationFromYear3OnwardPercent", Number(event.target.value || 0))}
                        className={userInputClassName}
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-600">Module efficiency drop from Year 3 onward</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-900">O&amp;M Cost (Year 1)</td>
                    <td className="px-3 py-2 text-slate-700">% / INR</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={documentData.roiOperationMaintenancePercentYear1}
                        onChange={(event) => setDocumentField("roiOperationMaintenancePercentYear1", Number(event.target.value || 0))}
                        className={userInputClassName}
                      />
                      <div className="mt-1 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        {formatCurrency(roiOperationMaintenanceCostYear1)}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-600">Year 1 maintenance cost as % of total cost</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-900">O&amp;M Cost Escalation</td>
                    <td className="px-3 py-2 text-slate-700">%</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={documentData.roiOperationMaintenanceEscalationPercent}
                        onChange={(event) => setDocumentField("roiOperationMaintenanceEscalationPercent", Number(event.target.value || 0))}
                        className={userInputClassName}
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-600">Inflation in O&amp;M</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-900">Project Life</td>
                    <td className="px-3 py-2 text-slate-700">Years</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={documentData.roiProjectLifeYears}
                        onChange={(event) => setDocumentField("roiProjectLifeYears", Number(event.target.value || 0))}
                        className={userInputClassName}
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-600">Standard plant life used for ROI projection</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className={calculatedCardClassName}>
              <div className="text-xs font-medium uppercase tracking-wide text-amber-700">Year 1 Generation</div>
              <div className="text-2xl font-bold text-amber-900">{formatDecimal(roiYear1GenerationKwh, 0)} kWh</div>
              <div className="mt-1 text-[11px] text-amber-700">After shutdown-day assumption</div>
            </div>
            <div className={calculatedCardClassName}>
              <div className="text-xs font-medium uppercase tracking-wide text-amber-700">Year 1 Gross Savings</div>
              <div className="text-2xl font-bold text-amber-900">{formatCurrency(roiYear1GrossSavings)}</div>
              <div className="mt-1 text-[11px] text-amber-700">Before O&amp;M cost</div>
            </div>
            <div className={calculatedCardClassName}>
              <div className="text-xs font-medium uppercase tracking-wide text-amber-700">Year 1 Net Savings</div>
              <div className="text-2xl font-bold text-amber-900">{formatCurrency(roiYear1NetSavings)}</div>
              <div className="mt-1 text-[11px] text-amber-700">After O&amp;M cost</div>
            </div>
            <div className={calculatedCardClassName}>
              <div className="text-xs font-medium uppercase tracking-wide text-amber-700">Estimated Payback</div>
              <div className="text-2xl font-bold text-amber-900">
                {roiEstimatedPaybackYears === null ? "Beyond projection" : `${formatDecimal(roiEstimatedPaybackYears)} years`}
              </div>
              <div className="mt-1 text-[11px] text-amber-700">Simple cumulative payback projection</div>
            </div>
            <div className={calculatedCardClassName}>
              <div className="text-xs font-medium uppercase tracking-wide text-amber-700">Lifetime Net Savings</div>
              <div className="text-2xl font-bold text-amber-900">{formatCurrency(roiLifetimeNetSavings)}</div>
              <div className="mt-1 text-[11px] text-amber-700">Projected over {roiProjectionYears} years</div>
            </div>
            <div className={calculatedCardClassName}>
              <div className="text-xs font-medium uppercase tracking-wide text-amber-700">O&amp;M Cost Year 1</div>
              <div className="text-2xl font-bold text-amber-900">{formatCurrency(roiOperationMaintenanceCostYear1)}</div>
              <div className="mt-1 text-[11px] text-amber-700">{formatDecimal(documentData.roiOperationMaintenancePercentYear1)}% of total cost</div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-amber-200 bg-white">
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
              <h4 className="text-sm font-semibold text-amber-900">ROI Calculation Table</h4>
              <p className="text-xs text-amber-800">Year-wise projection from ROI Calculation Table.docx with payback status based on cumulative savings versus total cost.</p>
            </div>
            <div className="max-h-[420px] overflow-auto">
              <table className="min-w-[1180px] table-fixed divide-y divide-amber-100 text-sm">
                <thead className="sticky top-0 bg-amber-50 text-[11px] uppercase tracking-wide text-amber-900">
                  <tr>
                    <th className="w-16 px-3 py-2 text-right">Year</th>
                    <th className="w-32 px-3 py-2 text-right">Generation (kWh)</th>
                    <th className="w-28 px-3 py-2 text-right">Tariff (Rs./kWh)</th>
                    <th className="w-36 px-3 py-2 text-right">Annual Revenue (Rs.)</th>
                    <th className="w-32 px-3 py-2 text-right">O&amp;M Cost (Rs.)</th>
                    <th className="w-36 px-3 py-2 text-right">Net Savings (Rs.)</th>
                    <th className="w-40 px-3 py-2 text-right">Cumulative Savings (Rs.)</th>
                    <th className="w-28 px-3 py-2 text-center">Payback Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  {roiProjectionRows.map((row) => (
                    <tr key={row.year} className="bg-white hover:bg-amber-50/40">
                      <td className="px-3 py-2 text-right font-medium text-slate-900">{row.year}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{formatDecimal(row.generationKwh, 0)}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{formatDecimal(row.tariffPerKwh)}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{formatCurrency(row.annualRevenue)}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{formatCurrency(row.operationMaintenanceCost)}</td>
                      <td className="px-3 py-2 text-right font-medium text-slate-900">{formatCurrency(row.netSavings)}</td>
                      <td className="px-3 py-2 text-right font-medium text-slate-900">{formatCurrency(row.cumulativeSavings)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${row.paybackAchieved ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {row.paybackAchieved ? "Yes" : "No"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </>
        )}

        {activeTab === "boq" && (
        <>
        {solarSystemConfigurationPanel}

        <div className="overflow-hidden rounded-lg border border-gray-200">
          <div className="border-b bg-gray-50 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-800">BOQ Builder</h3>
            <p className="text-xs text-gray-500">Fixed sequence from the workbook, with row-wise dropdowns and quantity inputs.</p>
          </div>

          {missingMandatoryBoqRows.length > 0 && (
            <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              Complete all mandatory BOQ rows before saving. Missing: {missingMandatoryBoqRows.map((row) => row.itemHead).join(", ")}.
            </div>
          )}

          <div className="max-h-[440px] overflow-auto">
            <table className="min-w-[1260px] table-fixed divide-y divide-gray-200">
              <thead className="sticky top-0 bg-yellow-50 text-[11px] uppercase tracking-wide text-gray-700">
                <tr>
                  <th className="w-14 px-2 py-2 text-left">Seq.</th>
                  <th className="w-52 px-2 py-2 text-left">Item Head</th>
                  <th className="w-[280px] px-2 py-2 text-left">Item Type</th>
                  <th className="w-44 px-2 py-2 text-left">Ratings / Capacity</th>
                  <th className="w-40 px-2 py-2 text-left">Selection Unit</th>
                  <th className="w-44 px-2 py-2 text-right">Unit Rate</th>
                  <th className="w-40 px-2 py-2 text-left">User Input Number</th>
                  <th className="w-28 px-2 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white text-sm">
                {RESIDENTIAL_BOQ_SEQUENCE.map((config) => {
                  const rowsForConfig = boqRows.filter((entry) => entry.sequence === config.sequence);
                  const isMissingMandatory = missingMandatoryBoqRows.some((row) => row.sequence === config.sequence);
                  const rowItems = getResidentialBoqRowItems(items, config);

                  const usedItemTypes = config.selectionMode === "multiple"
                    ? new Set(rowsForConfig.map((r) => (r.itemType || "").toLowerCase()).filter(Boolean))
                    : new Set<string>();

                  return rowsForConfig.map((row, rowIndex) => {
                    const filteredRowItems = row.fixedItemType
                      ? rowItems.filter((item) => matchesBoqItemType(getItemTypeFromItem(item), row.fixedItemType || ""))
                      : rowItems;
                    const itemTypeOptions = Array.from(
                      new Map(
                        filteredRowItems.map((item) => {
                          const itemType = getItemTypeFromItem(item);
                          return [itemType.toLowerCase(), { value: itemType, label: itemType }];
                        })
                      ).values()
                    ).filter((opt) => {
                      // For multiple-selection sequences, exclude types already chosen in other rows
                      if (config.selectionMode !== "multiple") return true;
                      const currentRowType = (row.itemType || "").toLowerCase();
                      if (opt.value.toLowerCase() === currentRowType) return true; // always show own selection
                      return !usedItemTypes.has(opt.value.toLowerCase());
                    });
                    const activeItemType = row.itemType || row.fixedItemType || "";
                    const ratingItems = filteredRowItems.filter((item) =>
                      !activeItemType || matchesBoqItemType(getItemTypeFromItem(item), activeItemType)
                    );
                    const selectedItem = items.find((item) => item.id === row.itemId);
                    const selectionUnit = selectedItem ? inferSelectionUnit(selectedItem) : "-";
                    const warrantySummary = selectedItem ? getWarrantySummary(selectedItem.description) : "";

                    return (
                      <tr key={row.id} className={`align-top ${isMissingMandatory && !row.itemId ? "bg-red-50/70" : "hover:bg-gray-50"}`}>
                        <td className="px-2 py-3 text-gray-700">{rowIndex === 0 ? config.sequence : ""}</td>
                        <td className="px-2 py-3 font-medium text-gray-900">
                          {rowIndex === 0 ? (
                            <div className="space-y-2">
                              <div>{config.itemHead}</div>
                              <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                                {config.mandatory && <span className="rounded-full bg-red-100 px-2 py-1 text-red-700">Mandatory</span>}
                                <span className="rounded-full bg-solar-sand px-2 py-1 text-solar-ink">
                                  {config.selectionMode === "multiple" ? "Multiple" : config.selectionMode === "fixed" ? "Fixed" : "Single"}
                                </span>
                              </div>
                            </div>
                          ) : null}
                        </td>
                        <td className="px-2 py-3">
                          {row.lockedItemType ? (
                            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                              {row.fixedItemType || row.itemType || "Fixed row"}
                            </div>
                          ) : (
                            <SearchableSelect
                              options={itemTypeOptions}
                              value={row.itemType}
                              onChange={(value) => handleSelectItemType(row.id, value)}
                              placeholder={itemTypeOptions.length > 0 ? "Select item type..." : "No mapped items found"}
                              searchPlaceholder="Search item types"
                              triggerClassName="border-red-300 bg-red-50"
                            />
                          )}
                        </td>
                        <td className="px-2 py-3 text-gray-700">
                          <SearchableSelect
                            options={ratingItems.map((item) => {
                              const display = getBoqDisplayParts(item);
                              return {
                                value: item.id,
                                label: display.ratingOrCapacity || item.name || "-",
                              };
                            })}
                            value={row.itemId}
                            onChange={(value) => handleSelectRating(row.id, value)}
                            placeholder={activeItemType ? "Select rating..." : "Select item type first"}
                            searchPlaceholder="Search ratings"
                            emptyLabel={activeItemType ? "No ratings found" : "Select item type first"}
                            disabled={!activeItemType}
                            triggerClassName="border-red-300 bg-red-50"
                          />
                        </td>
                        <td className="px-2 py-3 text-gray-700">{selectionUnit}</td>
                        <td className="px-2 py-3 text-right text-xs font-medium text-gray-900 sm:text-sm">
                          {selectedItem
                            ? isPercentageItem(selectedItem)
                              ? `${Number(selectedItem.unitPrice || 0).toFixed(2)}% of subtotal`
                              : `${formatCurrency(Number(selectedItem.unitPrice || 0))} / ${selectionUnit}`
                            : "-"}
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.quantity}
                            onChange={(event) => handleQuantityChange(row.id, event.target.value)}
                            disabled={!selectedItem}
                            className="w-28 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-right text-sm text-gray-900 disabled:bg-gray-100"
                          />
                          {selectedItem && isPercentageItem(selectedItem) && (
                            <div className="mt-1 text-xs text-amber-700">Use 1 to apply this percentage charge once.</div>
                          )}
                        </td>
                        <td className="px-2 py-3 text-center">
                          <div className="flex flex-col gap-2">
                            {(config.selectionMode === "multiple" || config.allowAdditional) && (
                              <button
                                type="button"
                                onClick={() => addBoqRow(config.sequence)}
                                className="rounded-md border border-solar-border bg-white px-2 py-2 text-xs font-semibold text-solar-ink"
                              >
                                Add
                              </button>
                            )}
                            {(config.selectionMode === "multiple" && rowsForConfig.length > 1) || (config.allowAdditional && !row.lockedItemType) ? (
                              <button
                                type="button"
                                onClick={() => removeBoqRow(row.id)}
                                className="rounded-md border border-red-200 bg-red-50 px-2 py-2 text-xs font-semibold text-red-700"
                              >
                                Remove
                              </button>
                            ) : null}
                            {config.selectionMode !== "multiple" && !config.allowAdditional && (
                              <span className="text-xs font-semibold text-solar-muted">
                                {config.selectionMode === "fixed" ? "Locked" : "Single"}
                              </span>
                            )}
                            {row.lockedItemType && config.allowAdditional && (
                              <span className="text-xs font-semibold text-amber-700">Fixed</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}

        {activeTab === "masters" && (
        <>
        {generationSettingsPanel}
        </>
        )}

        {activeTab === "payment" && (
        <>
        <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-cyan-900">Payment Stages</h3>
              <p className="text-xs text-cyan-800">These stages flow into the quotation payment schedule.</p>
            </div>
            <div className={`rounded-full px-3 py-1 text-xs font-semibold ${isPaymentTotalBalanced ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              Total {paymentStageTotal.toFixed(2)}%
            </div>
          </div>
          {hasInvalidPaymentTotal && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              Payment stages must total exactly 100% before saving this quotation.
            </div>
          )}
          {incompletePaymentStages.length > 0 && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              Complete all fields for every payment stage before saving. Incomplete stages: {incompletePaymentStages.map((entry) => entry.index + 1).join(", ")}.
            </div>
          )}
          <div className="overflow-hidden rounded-lg border border-cyan-200 bg-white">
            <div className="max-h-[440px] overflow-auto">
              <table className="min-w-[1120px] table-fixed divide-y divide-cyan-100 text-sm">
                <thead className="sticky top-0 bg-cyan-100 text-[11px] uppercase tracking-wide text-cyan-900">
                  <tr>
                    <th className="w-20 px-3 py-2 text-left">Stage</th>
                    <th className="w-64 px-3 py-2 text-left">Label</th>
                    <th className="w-72 px-3 py-2 text-left">Milestone</th>
                    <th className="w-32 px-3 py-2 text-right">Percentage</th>
                    <th className="w-40 px-3 py-2 text-right">Value</th>
                    <th className="w-72 px-3 py-2 text-left">Remarks</th>
                    <th className="w-24 px-3 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-100">
                  {paymentStageRows.map(({ index, stage, value }) => {
                    const isIncomplete = incompletePaymentStages.some((entry) => entry.index === index);
                    return (
                      <tr key={`${stage.label}-${index}`} className={isIncomplete ? "bg-red-50/80" : index % 2 === 0 ? "bg-white" : "bg-cyan-50/40"}>
                        <td className="px-3 py-3 align-top text-sm font-semibold text-solar-ink">Stage {index + 1}</td>
                        <td className="px-3 py-3 align-top">
                          <input
                            type="text"
                            value={stage.label}
                            onChange={(event) => updatePaymentStage(index, "label", event.target.value)}
                            className={userInputClassName}
                          />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <textarea
                            value={stage.milestone}
                            onChange={(event) => updatePaymentStage(index, "milestone", event.target.value)}
                            rows={2}
                            className={`${userInputClassName} min-h-[72px] resize-y`}
                          />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={stage.percentage}
                            onChange={(event) => updatePaymentStage(index, "percentage", event.target.value)}
                            className={`${userInputClassName} text-right`}
                          />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-right font-semibold text-amber-900">
                            {formatCurrency(value)}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <textarea
                            value={stage.remarks}
                            onChange={(event) => updatePaymentStage(index, "remarks", event.target.value)}
                            rows={2}
                            className={`${userInputClassName} min-h-[72px] resize-y`}
                          />
                        </td>
                        <td className="px-3 py-3 align-top text-center">
                          {documentData.paymentStages.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => removePaymentStage(index)}
                              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                            >
                              Remove
                            </button>
                          ) : (
                            <span className="text-xs text-solar-muted">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-cyan-50 text-sm font-semibold text-cyan-950">
                  <tr>
                    <td className="px-3 py-3" colSpan={3}>Totals</td>
                    <td className="px-3 py-3 text-right">{paymentStageTotal.toFixed(2)}%</td>
                    <td className="px-3 py-3 text-right">{formatCurrency(paymentStageRows.reduce((sum, entry) => sum + entry.value, 0))}</td>
                    <td className="px-3 py-3 text-left">Live value based on current quotation total</td>
                    <td className="px-3 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          <button
            type="button"
            onClick={addPaymentStage}
            className="mt-4 rounded-md border border-solar-border bg-white px-4 py-2 text-sm font-medium text-solar-ink"
          >
            Add Payment Stage
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          {missingBankFields.length > 0 && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              Complete all bank details before saving. Missing: {missingBankFields.map((field) => field.label).join(", ")}.
            </div>
          )}
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Bank Details</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Bank Name</label>
              <input type="text" value={documentData.bankDetails.bankName} onChange={(event) => updateBankField("bankName", event.target.value)} className={`${userInputClassName} ${missingBankFields.some((field) => field.key === "bankName") ? "ring-2 ring-red-300" : ""}`} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Account Name</label>
              <input type="text" value={documentData.bankDetails.accountName} onChange={(event) => updateBankField("accountName", event.target.value)} className={`${userInputClassName} ${missingBankFields.some((field) => field.key === "accountName") ? "ring-2 ring-red-300" : ""}`} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Account Number</label>
              <input type="text" value={documentData.bankDetails.accountNumber} onChange={(event) => updateBankField("accountNumber", event.target.value)} className={`${userInputClassName} ${missingBankFields.some((field) => field.key === "accountNumber") ? "ring-2 ring-red-300" : ""}`} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Account Type</label>
              <input type="text" value={documentData.bankDetails.accountType} onChange={(event) => updateBankField("accountType", event.target.value)} className={`${userInputClassName} ${missingBankFields.some((field) => field.key === "accountType") ? "ring-2 ring-red-300" : ""}`} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">IFSC Code</label>
              <input type="text" value={documentData.bankDetails.ifscCode} onChange={(event) => updateBankField("ifscCode", event.target.value)} className={`${userInputClassName} ${missingBankFields.some((field) => field.key === "ifscCode") ? "ring-2 ring-red-300" : ""}`} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Branch</label>
              <input type="text" value={documentData.bankDetails.branch} onChange={(event) => updateBankField("branch", event.target.value)} className={`${userInputClassName} ${missingBankFields.some((field) => field.key === "branch") ? "ring-2 ring-red-300" : ""}`} />
            </div>
          </div>
        </div>
        </>
        )}

        {activeTab === "scope" && (
        <>
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-indigo-900">Scope of Work Matrix</h3>
              <p className="text-xs text-indigo-800">These rows are saved with the quotation and flow into the PDF scope matrix.</p>
            </div>
            <button
              type="button"
              onClick={addScopeRow}
              className="rounded-md border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-900"
            >
              Add Scope Row
            </button>
          </div>
          {incompleteScopeRows.length > 0 && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              Complete all fields for every scope row before saving. Incomplete rows: {incompleteScopeRows.map((entry) => entry.index + 1).join(", ")}.
            </div>
          )}
          <div className="overflow-hidden rounded-lg border border-indigo-200 bg-white">
            <div className="max-h-[480px] overflow-auto">
              <table className="min-w-[1120px] table-fixed divide-y divide-indigo-100 text-sm">
                <thead className="sticky top-0 bg-indigo-100 text-[11px] uppercase tracking-wide text-indigo-950">
                  <tr>
                    <th className="w-28 px-3 py-2 text-left">Sr. No.</th>
                    <th className="w-[34rem] px-3 py-2 text-left">Work Item / Section Title</th>
                    <th className="w-56 px-3 py-2 text-left">Responsibility</th>
                    <th className="w-[26rem] px-3 py-2 text-left">Remarks</th>
                    <th className="w-24 px-3 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-100">
                  {documentData.scopeOfWorkRows.map((row, index) => {
                    const isSectionRow = isScopeSectionRow(row);
                    const isIncomplete = incompleteScopeRows.some((entry) => entry.index === index);
                    return (
                      <tr key={`${row.srNo}-${index}`} className={isSectionRow ? "bg-indigo-50" : isIncomplete ? "bg-red-50/80" : index % 2 === 0 ? "bg-white" : "bg-indigo-50/30"}>
                        <td className="px-3 py-3 align-top">
                          <input
                            type="text"
                            value={row.srNo}
                            onChange={(event) => updateScopeRow(index, "srNo", event.target.value)}
                            className={userInputClassName}
                          />
                        </td>
                        <td className="px-3 py-3 align-top">
                          {isSectionRow ? (
                            <input
                              type="text"
                              value={row.workItem}
                              onChange={(event) => updateScopeRow(index, "workItem", event.target.value)}
                              className={`${userInputClassName} font-semibold text-indigo-950`}
                            />
                          ) : (
                            <textarea
                              value={row.workItem}
                              onChange={(event) => updateScopeRow(index, "workItem", event.target.value)}
                              rows={2}
                              className={`${userInputClassName} min-h-[72px] resize-y`}
                            />
                          )}
                        </td>
                        <td className="px-3 py-3 align-top">
                          {isSectionRow ? (
                            <div className="rounded-md border border-indigo-300 bg-indigo-100 px-3 py-2 font-semibold text-indigo-950">
                              Section
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={row.responsibility}
                              onChange={(event) => updateScopeRow(index, "responsibility", event.target.value)}
                              className={userInputClassName}
                            />
                          )}
                        </td>
                        <td className="px-3 py-3 align-top">
                          {isSectionRow ? (
                            <div className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
                              {row.remarks || "Section heading row"}
                            </div>
                          ) : (
                            <textarea
                              value={row.remarks}
                              onChange={(event) => updateScopeRow(index, "remarks", event.target.value)}
                              rows={2}
                              className={`${userInputClassName} min-h-[72px] resize-y`}
                            />
                          )}
                        </td>
                        <td className="px-3 py-3 align-top text-center">
                          {documentData.scopeOfWorkRows.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => removeScopeRow(index)}
                              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                            >
                              Remove
                            </button>
                          ) : (
                            <span className="text-xs text-solar-muted">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <h3 className="mb-4 text-lg font-semibold text-rose-900">Required Documents</h3>
          {missingRequiredDocuments && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              Add at least one required document before saving.
            </div>
          )}
          <label className="mb-1 block text-sm font-medium text-gray-700">One document per line</label>
          <textarea
            value={documentData.requiredDocuments.join("\n")}
            onChange={(event) => updateRequiredDocuments(event.target.value)}
            rows={10}
            className={`${userInputClassName} ${missingRequiredDocuments ? "ring-2 ring-red-300" : ""}`}
          />
        </div>
        </>
        )}

        {activeTab === "preview" && (
        <>
        {hasValidationIssues && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <h3 className="text-lg font-semibold text-red-900">Resolve Validation Issues Before Saving</h3>
            <div className="mt-3 space-y-2 text-sm text-red-800">
              {(missingOverviewFields.length > 0 || invalidOverviewFields.length > 0) && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-white px-3 py-2">
                  <span>Overview issues: {[...missingOverviewFields.map((field) => field.label), ...invalidOverviewFields].join(", ")}.</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("overview")}
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                  >
                    Open Overview
                  </button>
                </div>
              )}
              {hasInvalidPaymentTotal && <div>Payment stages total {paymentStageTotal.toFixed(2)}%. It must equal 100%.</div>}
              {incompletePaymentStages.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-white px-3 py-2">
                  <span>Incomplete payment stages: {incompletePaymentStages.map((entry) => entry.index + 1).join(", ")}.</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("payment")}
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                  >
                    Open Payment
                  </button>
                </div>
              )}
              {missingBankFields.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-white px-3 py-2">
                  <span>Missing bank details: {missingBankFields.map((field) => field.label).join(", ")}.</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("payment")}
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                  >
                    Open Payment
                  </button>
                </div>
              )}
              {incompleteScopeRows.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-white px-3 py-2">
                  <span>Incomplete scope rows: {incompleteScopeRows.map((entry) => entry.index + 1).join(", ")}.</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("scope")}
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                  >
                    Open Scope
                  </button>
                </div>
              )}
              {missingRequiredDocuments && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-white px-3 py-2">
                  <span>Required documents list is empty.</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("scope")}
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                  >
                    Open Scope
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Quotation Snapshot</h3>
            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex justify-between gap-4"><span>Quotation</span><span className="font-semibold text-slate-900">{formData.title || "New quotation"}</span></div>
              <div className="flex justify-between gap-4"><span>Client</span><span className="font-semibold text-slate-900">{selectedClientLabel}</span></div>
              <div className="flex justify-between gap-4"><span>Inquiry</span><span className="font-semibold text-slate-900">{selectedInquiryLabel}</span></div>
              <div className="flex justify-between gap-4"><span>Version</span><span className="font-semibold text-slate-900">{formData.version}</span></div>
              <div className="flex justify-between gap-4"><span>Offer Label</span><span className="font-semibold text-slate-900">{formData.brand || "-"}</span></div>
              <div className="flex justify-between gap-4"><span>Prepared By</span><span className="font-semibold text-slate-900">{documentData.preparedBy || "-"}</span></div>
              <div className="flex justify-between gap-4"><span>Prepared For</span><span className="font-semibold text-slate-900">{documentData.preparedFor || formData.title || "-"}</span></div>
              <div className="flex justify-between gap-4"><span>Consumer Type</span><span className="font-semibold text-slate-900">{documentData.consumerType}</span></div>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="mb-4 text-lg font-semibold text-amber-900">System & Pricing Summary</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={calculatedCardClassName}>
                <div className="text-xs font-medium uppercase tracking-wide text-amber-700">System Size</div>
                <div className="text-2xl font-bold text-amber-900">{actualSystemKw.toFixed(2)} kWp</div>
                <div className="mt-1 text-[11px] text-amber-700">{numberOfModules} modules x {documentData.moduleWattage}W</div>
              </div>
              <div className={calculatedCardClassName}>
                <div className="text-xs font-medium uppercase tracking-wide text-amber-700">Grand Total</div>
                <div className="text-2xl font-bold text-amber-900">{formatCurrency(grandTotal)}</div>
                <div className="mt-1 text-[11px] text-amber-700">Subtotal {formatCurrency(subtotal)} + GST {formatCurrency(totalGst)}</div>
              </div>
            </div>
            <div className="mt-4 rounded-md border border-amber-300 bg-white p-3 text-sm text-amber-950">
              <div><strong>Resolved BOQ Rows:</strong> {resolvedRows.length}</div>
              <div className="mt-1"><strong>Cost / Watt:</strong> {actualSystemWatts > 0 ? formatCurrency(grandTotal / actualSystemWatts) : formatCurrency(0)}</div>
              <div className="mt-1"><strong>Cost / kW:</strong> {actualSystemKw > 0 ? formatCurrency(grandTotal / actualSystemKw) : formatCurrency(0)}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-rose-900">Generation &amp; Revenue Details</h3>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-rose-900">Format 5</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={calculatedCardClassName}>
                <div className="text-xs font-medium uppercase tracking-wide text-amber-700">Generation / Day</div>
                <div className="text-2xl font-bold text-amber-900">{formatDecimal(indicativeGenerationPerDay, 0)} Unit</div>
              </div>
              <div className={calculatedCardClassName}>
                <div className="text-xs font-medium uppercase tracking-wide text-amber-700">1st Year Generation</div>
                <div className="text-2xl font-bold text-amber-900">{formatDecimal(annualGenerationKwh, 0)} kWh</div>
              </div>
              <div className={calculatedCardClassName}>
                <div className="text-xs font-medium uppercase tracking-wide text-amber-700">Yearly Saving</div>
                <div className="text-2xl font-bold text-amber-900">{formatCurrency(annualGenerationSavings)}</div>
              </div>
              <div className={calculatedCardClassName}>
                <div className="text-xs font-medium uppercase tracking-wide text-amber-700">25 Year Saving</div>
                <div className="text-2xl font-bold text-amber-900">{formatCurrency(twentyFiveYearSavings)}</div>
              </div>
            </div>
            <div className="mt-3 rounded-md border border-rose-100 bg-white p-3 text-sm text-slate-700">
              {documentData.generationDisclaimer}
            </div>
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-emerald-900">Installation Timeline &amp; ROI</h3>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-900">
                {documentData.installationProcedureSteps.length} steps
              </span>
            </div>
            <div className="space-y-2 text-sm text-emerald-950">
              {documentData.installationProcedureSteps.slice(0, 4).map((step, index) => (
                <div key={`${step.step}-${index}-timeline-preview`} className="rounded-md border border-emerald-100 bg-white px-3 py-2">
                  <div className="font-medium">{step.step || `Step ${index + 1}`} - {step.procedure || "Procedure missing"}</div>
                  <div className="text-xs text-slate-600">{step.timePeriod || "Time period missing"}</div>
                </div>
              ))}
              {documentData.installationProcedureSteps.length > 4 && (
                <div className="text-xs font-medium text-emerald-900">
                  + {documentData.installationProcedureSteps.length - 4} more procedure step(s)
                </div>
              )}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className={calculatedCardClassName}>
                <div className="text-xs font-medium uppercase tracking-wide text-amber-700">Estimated Payback</div>
                <div className="text-2xl font-bold text-amber-900">
                  {roiEstimatedPaybackYears === null ? "Beyond projection" : `${formatDecimal(roiEstimatedPaybackYears)} years`}
                </div>
              </div>
              <div className={calculatedCardClassName}>
                <div className="text-xs font-medium uppercase tracking-wide text-amber-700">Lifetime Net Savings</div>
                <div className="text-2xl font-bold text-amber-900">{formatCurrency(roiLifetimeNetSavings)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-sky-900">BOQ Summary</h3>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-sky-900">{resolvedRows.length} active rows</span>
            </div>
            <div className="space-y-2 text-sm text-sky-950">
              {resolvedRows.slice(0, 6).map((row) => (
                <div key={`${row.sequence}-${row.itemId}`} className="rounded-md border border-sky-100 bg-white px-3 py-2">
                  <div className="font-medium">{row.itemHead}</div>
                  <div className="text-xs text-slate-600">{row.lineDescription}</div>
                  <div className="mt-1 text-xs text-slate-700">Qty {row.quantity} | Rate {formatCurrency(row.rate)} | Total {formatCurrency(row.grandTotal)}</div>
                </div>
              ))}
              {resolvedRows.length > 6 && (
                <div className="text-xs font-medium text-sky-900">+ {resolvedRows.length - 6} more BOQ row(s)</div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-cyan-900">Payment Summary</h3>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${hasInvalidPaymentTotal ? "bg-red-100 text-red-700" : "bg-white text-cyan-900"}`}>
                {paymentStageTotal.toFixed(2)}%
              </span>
            </div>
            <div className="space-y-2 text-sm text-cyan-950">
              {paymentStageRows.map(({ index, stage, value }) => (
                <div
                  key={`${stage.label}-${index}-preview`}
                  className={`rounded-md border bg-white px-3 py-2 ${
                    incompletePaymentStages.some((entry) => entry.index === index) ? "border-red-200" : "border-cyan-100"
                  }`}
                >
                  <div className="font-medium">{stage.label || `Stage ${index + 1}`}</div>
                  <div className="text-xs text-slate-600">{stage.milestone || "Milestone missing"}</div>
                  <div className="mt-1 text-xs text-slate-700">{Number(stage.percentage || 0).toFixed(2)}% | {formatCurrency(value)} | {stage.remarks || "Remarks missing"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-indigo-900">Scope Summary</h3>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-900">{documentData.scopeOfWorkRows.length} rows</span>
            </div>
            <div className="space-y-2 text-sm text-indigo-950">
              {documentData.scopeOfWorkRows.slice(0, 5).map((row, index) => (
                <div
                  key={`${row.srNo}-${index}-preview`}
                  className={`rounded-md border bg-white px-3 py-2 ${
                    incompleteScopeRows.some((entry) => entry.index === index)
                      ? "border-red-200"
                      : isScopeSectionRow(row)
                        ? "border-indigo-300 bg-indigo-100"
                        : "border-indigo-100"
                  }`}
                >
                  <div className="font-medium">{row.srNo || `Row ${index + 1}`} - {row.workItem || "Work item missing"}</div>
                  {!isScopeSectionRow(row) && (
                    <div className="text-xs text-slate-700">{row.responsibility || "Responsibility missing"}</div>
                  )}
                </div>
              ))}
              {documentData.scopeOfWorkRows.length > 5 && (
                <div className="text-xs font-medium text-indigo-900">+ {documentData.scopeOfWorkRows.length - 5} more scope row(s)</div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-rose-900">Documents & Bank Details</h3>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-rose-900">{documentData.requiredDocuments.length} docs</span>
            </div>
            <div className={`rounded-md border bg-white p-3 text-sm text-slate-700 ${missingBankFields.length > 0 ? "border-red-200" : "border-rose-100"}`}>
              <div><strong>Bank:</strong> {documentData.bankDetails.bankName}</div>
              <div className="mt-1"><strong>Account Name:</strong> {documentData.bankDetails.accountName}</div>
              <div className="mt-1"><strong>Account Number:</strong> {documentData.bankDetails.accountNumber}</div>
              <div className="mt-1"><strong>IFSC:</strong> {documentData.bankDetails.ifscCode}</div>
              <div className="mt-1"><strong>Branch:</strong> {documentData.bankDetails.branch}</div>
            </div>
            {missingBankFields.length > 0 && (
              <div className="mt-3 text-sm text-red-700">Missing bank fields: {missingBankFields.map((field) => field.label).join(", ")}.</div>
            )}
            <div className="mt-3 space-y-2 text-sm text-rose-950">
              {documentData.requiredDocuments.slice(0, 6).map((document) => (
                <div key={document} className="rounded-md border border-rose-100 bg-white px-3 py-2">
                  {document}
                </div>
              ))}
              {missingRequiredDocuments && (
                <div className="rounded-md border border-red-200 bg-white px-3 py-2 text-red-700">
                  No required documents added yet.
                </div>
              )}
              {documentData.requiredDocuments.length > 6 && (
                <div className="text-xs font-medium text-rose-900">+ {documentData.requiredDocuments.length - 6} more document(s)</div>
              )}
            </div>
          </div>
        </div>
        </>
        )}

        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex justify-between text-amber-800">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-amber-800">
                <span>GST</span>
                <span>{formatCurrency(totalGst)}</span>
              </div>
              <div className="flex justify-between border-t border-amber-300 pt-2 font-semibold text-amber-950">
                <span>Grand Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>
            <div className="rounded-md border border-amber-300 bg-amber-100 p-3 text-xs text-amber-900">
              <div><strong>Resolved rows:</strong> {resolvedRows.length}</div>
              <div className="mt-1"><strong>Cost / Watt:</strong> {actualSystemWatts > 0 ? formatCurrency(grandTotal / actualSystemWatts) : formatCurrency(0)}</div>
              <div className="mt-1"><strong>Cost / kW:</strong> {actualSystemKw > 0 ? formatCurrency(grandTotal / actualSystemKw) : formatCurrency(0)}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="text-xs font-medium uppercase tracking-wide text-solar-muted">
              Step {activeTabIndex + 1} of {FORM_TABS.length}
            </div>
            {hasValidationIssues && validationErrorMessage && (
              <div className="text-xs font-medium text-red-700">
                {validationErrorMessage}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => previousTab && setActiveTab(previousTab.key)}
                disabled={!previousTab}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous Tab
              </button>
              <button
                type="button"
                onClick={() => nextTab && setActiveTab(nextTab.key)}
                disabled={!nextTab}
                className="rounded-md border border-solar-border bg-solar-sand px-4 py-2 text-sm font-medium text-solar-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next Tab
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || resolvedRows.length === 0}
              className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {loading ? (isEditing ? "Updating..." : "Creating...") : isEditing ? "Update Quotation" : isNewVersion ? "Create Version" : "Create Quotation"}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
    {showClientForm && (
      <ClientForm
        onClose={() => setShowClientForm(false)}
        onSuccess={(client) => {
          if (!client) {
            return;
          }

          setClients((prev) => sortClientsByName([
            ...prev.filter((entry) => entry.id !== client.id),
            { ...client, contactName: client.contactName ?? undefined },
          ]));
          setFormData((prev) => ({
            ...prev,
            clientId: client.id,
            inquiryId: "",
          }));
        }}
      />
    )}
    </>
  );
}
