"use client";

import { useEffect, useMemo, useState } from "react";
import { ModalShell } from "@/components/modal-shell";
import { SearchableSelect } from "@/components/searchable-select";
import { formatCurrency } from "@/lib/format";
import { createDefaultQuotationDocumentData, type QuotationDocumentData } from "@/lib/quotation-document";
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
  defaultClientId?: string;
  defaultInquiryId?: string;
  defaultTitle?: string;
  defaultVersion?: string;
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

export function SolarQuotationForm({
  onClose,
  onSuccess,
  quotationId,
  defaultClientId,
  defaultInquiryId,
  defaultTitle,
  defaultVersion,
  clientName,
  inquiryTitle,
}: SolarQuotationFormProps) {
  const isNewVersion = Boolean(quotationId);
  const [clients, setClients] = useState<Client[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [items, setItems] = useState<SolarBoqItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    clientId: defaultClientId || "",
    inquiryId: defaultInquiryId || "",
    title: defaultTitle || "",
    version: defaultVersion || "1.0",
    brand: "",
  });
  const [documentData, setDocumentData] = useState<QuotationDocumentData>(() =>
    createDefaultQuotationDocumentData({
      preparedFor: defaultTitle || inquiryTitle || "",
      moduleWattage: 630,
      numberOfModules: 24,
      totalWatts: 15120,
      totalKw: 15.12,
    })
  );
  const [boqRows, setBoqRows] = useState<BoqDraftRow[]>(() => createInitialRows());

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!formData.clientId) {
      setErrorMessage("Please select a client");
      return;
    }

    if (!formData.title) {
      setErrorMessage("Please enter a quotation title");
      return;
    }

    if (resolvedRows.length === 0) {
      setErrorMessage("Please select at least one BOQ item");
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

      const url = quotationId ? `/api/quotations/${quotationId}/versions` : "/api/quotations";
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create quotation");
      }

      onSuccess();
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create quotation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      onClose={onClose}
      title={isNewVersion ? `New Version ${formData.version}` : "New Solar EPC Quotation"}
      subtitle={isNewVersion && clientName ? `For ${clientName}` : "BOQ sequence aligned with the shared workbook"}
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

        {errorMessage && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
        )}

        {isNewVersion && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-900">Creating version {formData.version}</p>
            <p className="text-xs text-amber-700">The same BOQ layout will be saved as a new quotation version.</p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Client <span className="text-red-500">*</span>
            </label>
            {isNewVersion ? (
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
            <input
              type="text"
              value={formData.version}
              onChange={(event) => setFormData((prev) => ({ ...prev, version: event.target.value }))}
              className={userInputClassName}
            />
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
                className={userInputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Customer Contact Person</label>
              <input
                type="text"
                value={documentData.customerContactPerson}
                onChange={(event) => setDocumentField("customerContactPerson", event.target.value)}
                placeholder="Customer contact person"
                className={userInputClassName}
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
                className={userInputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Validity (Days)</label>
              <input
                type="number"
                min="1"
                value={documentData.validityDays}
                onChange={(event) => setDocumentField("validityDays", Number(event.target.value || 0))}
                className={userInputClassName}
              />
            </div>
          </div>
        </div>

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
            </div>
            <div className={calculatedCardClassName}>
              <div className="text-xs font-medium uppercase tracking-wide text-amber-700">Total KW</div>
              <div className="text-2xl font-bold text-amber-900">{actualSystemKw.toFixed(2)}</div>
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
          </div>
        </div>

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

        <div className="flex justify-end gap-3 border-t pt-4">
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
            {loading ? "Creating..." : isNewVersion ? "Create Version" : "Create Quotation"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}