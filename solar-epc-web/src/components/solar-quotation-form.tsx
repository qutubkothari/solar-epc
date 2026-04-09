"use client";

import { useEffect, useMemo, useState } from "react";
import { ModalShell } from "@/components/modal-shell";
import { SearchableSelect } from "@/components/searchable-select";
import { formatCurrency } from "@/lib/format";
import {
  extractWattageFromItem,
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
  const [systemConfig, setSystemConfig] = useState({
    systemCapacityKw: 15,
    moduleWattage: 630,
  });
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

  const systemCapacityWatts = systemConfig.systemCapacityKw * 1000;
  const safeModuleWattage = Math.max(systemConfig.moduleWattage || 1, 1);
  const numberOfModules = Math.ceil(systemCapacityWatts / safeModuleWattage);
  const actualSystemWatts = numberOfModules * safeModuleWattage;
  const actualSystemKw = actualSystemWatts / 1000;

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
        ? baseSubtotal * (entry.rawRate / 100)
        : entry.rawRate;
      const baseTotal = resolvedRate * entry.quantity;
      const taxTotal = baseTotal * entry.taxPercent;
      const grandTotal = baseTotal + taxTotal;
      const brandPart = entry.item.brand ? ` | ${entry.item.brand}` : "";
      const lineDescription = `${entry.row.itemHead} | ${entry.item.name}${brandPart} | ${entry.selectionUnit}`;

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
        setSystemConfig((prev) => ({ ...prev, moduleWattage: wattage }));
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
        moduleWattage: systemConfig.moduleWattage,
        numberOfModules,
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
              <div className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700">
                {clientName || "Loading..."}
              </div>
            ) : (
              <SearchableSelect
                options={clientOptions}
                value={formData.clientId}
                onChange={(value) => setFormData((prev) => ({ ...prev, clientId: value }))}
                placeholder="Select client..."
              />
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Inquiry / Project</label>
            {isNewVersion ? (
              <div className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700">
                {inquiryTitle || "Not linked"}
              </div>
            ) : (
              <SearchableSelect
                options={inquiryOptions}
                value={formData.inquiryId}
                onChange={(value) => setFormData((prev) => ({ ...prev, inquiryId: value }))}
                placeholder="Select inquiry..."
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
              <div className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700">
                {formData.title}
              </div>
            ) : (
              <input
                type="text"
                value={formData.title}
                onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="e.g., Roof Top Solar System"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
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
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Offer Label / Brand</label>
            <input
              type="text"
              value={formData.brand}
              onChange={(event) => setFormData((prev) => ({ ...prev, brand: event.target.value }))}
              placeholder="e.g., Sungrow + Pahal"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        </div>

        <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-4 text-lg font-semibold text-blue-900">Solar System Configuration</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">System Capacity (kW)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={systemConfig.systemCapacityKw}
                onChange={(event) =>
                  setSystemConfig((prev) => ({
                    ...prev,
                    systemCapacityKw: Number(event.target.value || 0),
                  }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Module Wattage (W)</label>
              <input
                type="number"
                min="0"
                value={systemConfig.moduleWattage}
                onChange={(event) =>
                  setSystemConfig((prev) => ({
                    ...prev,
                    moduleWattage: Number(event.target.value || 0),
                  }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div className="rounded-md border-2 border-blue-300 bg-white p-3">
              <div className="text-xs text-gray-600">No. of Modules</div>
              <div className="text-2xl font-bold text-blue-600">{numberOfModules}</div>
            </div>
          </div>
          <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <strong>System Summary:</strong> {actualSystemKw.toFixed(2)} kWp ({numberOfModules} x {systemConfig.moduleWattage}W = {actualSystemWatts.toLocaleString()}W)
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200">
          <div className="border-b bg-gray-50 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-800">BOQ Builder</h3>
            <p className="text-xs text-gray-500">Fixed sequence from the workbook, with row-wise dropdowns and quantity inputs.</p>
          </div>

          <div className="max-h-[440px] overflow-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="sticky top-0 bg-yellow-50 text-[11px] uppercase tracking-wide text-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left">Seq.</th>
                  <th className="px-3 py-2 text-left">Item Head</th>
                  <th className="px-3 py-2 text-left">Item Type &amp; Ratings / Capacity</th>
                  <th className="px-3 py-2 text-left">As Per Selection Unit</th>
                  <th className="px-3 py-2 text-left">User Input Number</th>
                  <th className="px-3 py-2 text-right">Amount</th>
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
                      <td className="px-3 py-3 text-gray-700">{config.sequence}</td>
                      <td className="px-3 py-3 font-medium text-gray-900">{config.itemHead}</td>
                      <td className="min-w-[300px] px-3 py-3">
                        <SearchableSelect
                          options={rowItems.map((item) => ({
                            value: item.id,
                            label: item.name,
                            subtitle: `${item.brand || item.category || "BOQ Item"} • ${formatCurrency(Number(item.unitPrice || 0))}${isPercentageItem(item) ? " of subtotal" : ` / ${inferSelectionUnit(item)}`}`,
                          }))}
                          value={row?.itemId || ""}
                          onChange={(value) => handleSelectItem(config.sequence, value)}
                          placeholder={rowItems.length > 0 ? "Select item..." : "No mapped items found"}
                          searchPlaceholder="Search BOQ items"
                        />
                      </td>
                      <td className="px-3 py-3 text-gray-700">
                        <div>{selectionUnit}</div>
                        {selectedItem && (
                          <div className="mt-1 text-xs text-gray-500">
                            Rate {formatCurrency(Number(resolved?.rawRate || selectedItem.unitPrice || 0))}
                            {isPercentageItem(selectedItem) ? " as %" : ` / ${selectionUnit}`}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row?.quantity ?? 0}
                          onChange={(event) => handleQuantityChange(config.sequence, event.target.value)}
                          disabled={!selectedItem}
                          className="w-28 rounded-md border border-gray-300 px-3 py-2 text-right disabled:bg-gray-100"
                        />
                        {selectedItem && isPercentageItem(selectedItem) && (
                          <div className="mt-1 text-xs text-amber-700">Use 1 to apply this percentage charge once.</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-gray-900">
                        {resolved ? formatCurrency(resolved.grandTotal) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>GST</span>
                <span>{formatCurrency(totalGst)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900">
                <span>Grand Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>
            <div className="rounded-md border border-blue-100 bg-white p-3 text-xs text-gray-600">
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