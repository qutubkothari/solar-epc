"use client";

import { useEffect, useMemo, useState } from "react";
import { ModalShell } from "@/components/modal-shell";
import { SearchableSelect } from "@/components/searchable-select";
import { formatCurrency } from "@/lib/format";
import {
  createDefaultQuotationDocumentData,
  normalizeQuotationDocumentData,
  type QuotationDocumentData,
} from "@/lib/quotation-document";
import {
  extractWattageFromItem,
  getBoqDisplayParts,
  getBoqRowItems,
  getDefaultQuantity,
  inferSelectionUnit,
  isPercentageItem,
  SOLAR_BOQ_SEQUENCE,
  type SolarBoqItem,
} from "@/lib/solar-boq";

type Client = {
  id: string;
  name: string;
};

type Inquiry = {
  id: string;
  title: string;
  clientId: string;
};

type BoqDraftRow = {
  sequence: number;
  itemHead: string;
  itemId: string;
  quantity: number;
  quantityTouched: boolean;
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

type QuotationFormTab = "overview" | "technical" | "boq" | "payment" | "scope" | "preview";

const percentToDecimal = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return value > 1 ? value / 100 : value;
};

type SolarQuotationFormProps = {
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
  initialBoqRows?: BoqDraftRow[];
  clientName?: string;
  inquiryTitle?: string;
};

const createInitialRows = (): BoqDraftRow[] =>
  SOLAR_BOQ_SEQUENCE.map((row) => ({
    sequence: row.sequence,
    itemHead: row.itemHead,
    itemId: "",
    quantity: 0,
    quantityTouched: false,
  }));

const userInputClassName =
  "w-full rounded-md border border-red-300 bg-red-50 px-3 py-2 text-gray-900 placeholder:text-red-300 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100";

const calculatedCardClassName = "rounded-md border border-amber-300 bg-amber-100 p-3";

const calculatedPanelClassName = "rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900";

const readOnlyFieldClassName = "w-full rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900";

const PAYMENT_TOTAL_TOLERANCE = 0.01;

const FORM_TABS: Array<{ key: QuotationFormTab; label: string; description: string }> = [
  { key: "overview", label: "Overview", description: "Client, quotation, and proposal basics" },
  { key: "technical", label: "Technical Proposal", description: "System sizing and technical defaults" },
  { key: "boq", label: "BOQ & Pricing", description: "Workbook BOQ builder and totals" },
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

export function SolarQuotationForm({
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
  inquiryTitle,
}: SolarQuotationFormProps) {
  const isEditing = Boolean(quotationId && editVersionId);
  const isNewVersion = Boolean(quotationId && !editVersionId);
  const [clients, setClients] = useState<Client[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [items, setItems] = useState<SolarBoqItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [activeTab, setActiveTab] = useState<QuotationFormTab>("overview");
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
          moduleWattage: 630,
          numberOfModules: 24,
          totalWatts: 15120,
          totalKw: 15.12,
        })
  );
  const [boqRows, setBoqRows] = useState<BoqDraftRow[]>(() =>
    initialBoqRows && initialBoqRows.length > 0 ? initialBoqRows : createInitialRows()
  );

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

  const safeModuleWattage = Math.max(documentData.moduleWattage || 1, 1);
  const numberOfModules = Math.max(Number(documentData.numberOfModules || 0), 0);
  const actualSystemWatts = numberOfModules * safeModuleWattage;
  const actualSystemKw = actualSystemWatts / 1000;

  const setDocumentField = <K extends keyof QuotationDocumentData>(
    key: K,
    value: QuotationDocumentData[K]
  ) => {
    setDocumentData((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    setBoqRows((prev) => {
      let changed = false;
      const next = prev.map((row) => {
        if (!row.itemId || row.quantityTouched) {
          return row;
        }

        const selectedItem = items.find((item) => item.id === row.itemId);
        const config = SOLAR_BOQ_SEQUENCE.find((entry) => entry.sequence === row.sequence);
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
  const missingOverviewFields = OVERVIEW_REQUIRED_FIELDS.filter(({ key }) => !documentData[key].trim());
  const invalidOverviewFields = documentData.validityDays <= 0 ? ["Validity (Days)"] : [];
  const paymentStageTotal = documentData.paymentStages.reduce((sum, stage) => sum + Number(stage.percentage || 0), 0);
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
    incompletePaymentStages.length +
    incompleteScopeRows.length +
    missingBankFields.length +
    (hasInvalidPaymentTotal ? 1 : 0) +
    (missingRequiredDocuments ? 1 : 0);
  const hasValidationIssues =
    hasInvalidPaymentTotal ||
    missingOverviewFields.length > 0 ||
    invalidOverviewFields.length > 0 ||
    incompletePaymentStages.length > 0 ||
    incompleteScopeRows.length > 0 ||
    missingBankFields.length > 0 ||
    missingRequiredDocuments;
  const activeTabIndex = FORM_TABS.findIndex((tab) => tab.key === activeTab);
  const previousTab = activeTabIndex > 0 ? FORM_TABS[activeTabIndex - 1] : null;
  const nextTab = activeTabIndex < FORM_TABS.length - 1 ? FORM_TABS[activeTabIndex + 1] : null;
  const selectedClientLabel = clientName || clientOptions.find((entry) => entry.value === formData.clientId)?.label || "Not selected";
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

  const handleSelectItem = (sequence: number, itemId: string) => {
    const config = SOLAR_BOQ_SEQUENCE.find((entry) => entry.sequence === sequence);
    const selectedItem = items.find((item) => item.id === itemId);

    setBoqRows((prev) =>
      prev.map((row) => {
        if (row.sequence !== sequence) {
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
          itemId,
          quantity: row.quantityTouched && row.itemId ? row.quantity : nextQty,
          quantityTouched: false,
        };
      })
    );

    if (sequence === 1 && selectedItem) {
      const wattage = extractWattageFromItem(selectedItem);
      if (wattage) {
        setDocumentField("moduleWattage", wattage);
      }
    }
  };

  const handleQuantityChange = (sequence: number, value: string) => {
    const quantity = Number(value || 0);
    setBoqRows((prev) =>
      prev.map((row) =>
        row.sequence === sequence
          ? {
              ...row,
              quantity,
              quantityTouched: true,
            }
          : row
      )
    );
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    setErrorMessage(null);

    if (!formData.clientId) {
      return;
    }

    if (!formData.title) {
      return;
    }

    if (missingOverviewFields.length > 0 || invalidOverviewFields.length > 0) {
      setActiveTab("overview");
      return;
    }

    if (resolvedRows.length === 0) {
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
              <SearchableSelect
                options={clientOptions}
                value={formData.clientId}
                onChange={(value) => setFormData((prev) => ({ ...prev, clientId: value }))}
                placeholder="Select client..."
                triggerClassName="border-red-300 bg-red-50"
              />
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
                placeholder="Customer contact person"
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
        <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-4 text-lg font-semibold text-blue-900">Solar System Configuration</h3>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Module Wattage (W)</label>
              <input
                type="number"
                min="0"
                value={documentData.moduleWattage}
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
                value={documentData.numberOfModules}
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
              <label className="mb-1 block text-sm font-medium text-gray-700">Expected Generation Units / kW / Day</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={documentData.expectedGenerationUnitsPerKw}
                onChange={(event) => setDocumentField("expectedGenerationUnitsPerKw", Number(event.target.value || 0))}
                className={userInputClassName}
              />
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
        </>
        )}

        {activeTab === "boq" && (
        <>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <div className="border-b bg-gray-50 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-800">BOQ Builder</h3>
            <p className="text-xs text-gray-500">Fixed sequence from the workbook, with row-wise dropdowns and quantity inputs.</p>
          </div>

          <div className="max-h-[440px] overflow-auto">
            <table className="min-w-[960px] table-fixed divide-y divide-gray-200">
              <thead className="sticky top-0 bg-yellow-50 text-[11px] uppercase tracking-wide text-gray-700">
                <tr>
                  <th className="w-14 px-2 py-2 text-left">Seq.</th>
                  <th className="w-40 px-2 py-2 text-left">Item Head</th>
                  <th className="w-[320px] px-2 py-2 text-left">Item Type &amp; Ratings / Capacity</th>
                  <th className="w-40 px-2 py-2 text-left">Selection Unit</th>
                  <th className="w-44 px-2 py-2 text-right">Unit Rate</th>
                  <th className="w-40 px-2 py-2 text-left">User Input Number</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white text-sm">
                {SOLAR_BOQ_SEQUENCE.map((config) => {
                  const row = boqRows.find((entry) => entry.sequence === config.sequence);
                  const rowItems = getBoqRowItems(items, config);
                  const selectedItem = items.find((item) => item.id === row?.itemId);
                  const resolved = resolvedRows.find((entry) => entry.sequence === config.sequence);
                  const selectionUnit = selectedItem ? inferSelectionUnit(selectedItem) : "-";

                  return (
                    <tr key={config.sequence} className="align-top hover:bg-gray-50">
                      <td className="px-2 py-3 text-gray-700">{config.sequence}</td>
                      <td className="px-2 py-3 font-medium text-gray-900">{config.itemHead}</td>
                      <td className="px-2 py-3">
                        <SearchableSelect
                          options={rowItems.map((item) => ({
                            value: item.id,
                            label: (() => {
                              const display = getBoqDisplayParts(item);
                              return display.ratingOrCapacity
                                ? `${display.itemType} - ${display.ratingOrCapacity}`
                                : display.itemType;
                            })(),
                            subtitle: item.brand || undefined,
                          }))}
                          value={row?.itemId || ""}
                          onChange={(value) => handleSelectItem(config.sequence, value)}
                          placeholder={rowItems.length > 0 ? "Select item..." : "No mapped items found"}
                          searchPlaceholder="Search BOQ items"
                          triggerClassName="border-red-300 bg-red-50"
                        />
                      </td>
                      <td className="px-2 py-3 text-gray-700">
                        <div>{selectionUnit}</div>
                        {selectedItem && (
                          <div className="mt-1 text-xs text-gray-500">
                            {(() => {
                              const display = getBoqDisplayParts(selectedItem);
                              return display.ratingOrCapacity || selectedItem.brand || "";
                            })()}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-3 text-right text-xs font-medium text-gray-900 sm:text-sm">
                        {selectedItem
                          ? isPercentageItem(selectedItem)
                            ? `${Number(resolved?.rawRate || selectedItem.unitPrice || 0).toFixed(2)}% of subtotal`
                            : `${formatCurrency(Number(resolved?.rawRate || selectedItem.unitPrice || 0))} / ${selectionUnit}`
                          : "-"}
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row?.quantity ?? 0}
                          onChange={(event) => handleQuantityChange(config.sequence, event.target.value)}
                          disabled={!selectedItem}
                          className="w-28 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-right text-sm text-gray-900 disabled:bg-gray-100"
                        />
                        {selectedItem && isPercentageItem(selectedItem) && (
                          <div className="mt-1 text-xs text-amber-700">Use 1 to apply this percentage charge once.</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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
            <div className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentStageTotal === 100 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
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
          <div className="space-y-3">
            {documentData.paymentStages.map((stage, index) => (
              <div
                key={`${stage.label}-${index}`}
                className={`rounded-lg border bg-white p-4 ${
                  incompletePaymentStages.some((entry) => entry.index === index)
                    ? "border-red-200"
                    : "border-cyan-200"
                }`}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-solar-ink">Stage {index + 1}</div>
                  {documentData.paymentStages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePaymentStage(index)}
                      className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Label</label>
                    <input
                      type="text"
                      value={stage.label}
                      onChange={(event) => updatePaymentStage(index, "label", event.target.value)}
                      className={userInputClassName}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Percentage</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={stage.percentage}
                      onChange={(event) => updatePaymentStage(index, "percentage", event.target.value)}
                      className={userInputClassName}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Milestone</label>
                    <textarea
                      value={stage.milestone}
                      onChange={(event) => updatePaymentStage(index, "milestone", event.target.value)}
                      rows={2}
                      className={userInputClassName}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Remarks</label>
                    <textarea
                      value={stage.remarks}
                      onChange={(event) => updatePaymentStage(index, "remarks", event.target.value)}
                      rows={2}
                      className={userInputClassName}
                    />
                  </div>
                </div>
              </div>
            ))}
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
          <div className="space-y-3">
            {documentData.scopeOfWorkRows.map((row, index) => (
              <div
                key={`${row.srNo}-${index}`}
                className={`rounded-lg border bg-white p-4 ${
                  incompleteScopeRows.some((entry) => entry.index === index)
                    ? "border-red-200"
                    : isScopeSectionRow(row)
                      ? "border-indigo-300 bg-indigo-100"
                      : "border-indigo-200"
                }`}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-indigo-950">
                    {isScopeSectionRow(row) ? `Section ${row.srNo}` : `Scope Row ${index + 1}`}
                  </div>
                  {documentData.scopeOfWorkRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeScopeRow(index)}
                      className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {isScopeSectionRow(row) ? (
                  <div className="grid gap-4 md:grid-cols-[120px_1fr]">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Section No.</label>
                      <input
                        type="text"
                        value={row.srNo}
                        onChange={(event) => updateScopeRow(index, "srNo", event.target.value)}
                        className={userInputClassName}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Section Title</label>
                      <input
                        type="text"
                        value={row.workItem}
                        onChange={(event) => updateScopeRow(index, "workItem", event.target.value)}
                        className={userInputClassName}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Sr. No.</label>
                      <input
                        type="text"
                        value={row.srNo}
                        onChange={(event) => updateScopeRow(index, "srNo", event.target.value)}
                        className={userInputClassName}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Responsibility</label>
                      <input
                        type="text"
                        value={row.responsibility}
                        onChange={(event) => updateScopeRow(index, "responsibility", event.target.value)}
                        className={userInputClassName}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700">Work Item / Activity</label>
                      <textarea
                        value={row.workItem}
                        onChange={(event) => updateScopeRow(index, "workItem", event.target.value)}
                        rows={2}
                        className={userInputClassName}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700">Remarks</label>
                      <textarea
                        value={row.remarks}
                        onChange={(event) => updateScopeRow(index, "remarks", event.target.value)}
                        rows={2}
                        className={userInputClassName}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
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
              {documentData.paymentStages.map((stage, index) => (
                <div
                  key={`${stage.label}-${index}-preview`}
                  className={`rounded-md border bg-white px-3 py-2 ${
                    incompletePaymentStages.some((entry) => entry.index === index) ? "border-red-200" : "border-cyan-100"
                  }`}
                >
                  <div className="font-medium">{stage.label || `Stage ${index + 1}`}</div>
                  <div className="text-xs text-slate-600">{stage.milestone || "Milestone missing"}</div>
                  <div className="mt-1 text-xs text-slate-700">{Number(stage.percentage || 0).toFixed(2)}% | {stage.remarks || "Remarks missing"}</div>
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
            {hasValidationIssues && (
              <div className="text-xs font-medium text-red-700">
                Resolve payment, bank, scope, and document warnings before saving.
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
              disabled={loading || resolvedRows.length === 0 || hasValidationIssues}
              className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {loading ? (isEditing ? "Updating..." : "Creating...") : isEditing ? "Update Quotation" : isNewVersion ? "Create Version" : "Create Quotation"}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}