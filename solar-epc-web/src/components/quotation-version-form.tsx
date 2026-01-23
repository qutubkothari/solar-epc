"use client";

import { useEffect, useMemo, useState } from "react";
import { ModalShell } from "@/components/modal-shell";

type Item = {
  id: string;
  name: string;
  unitPrice: number;
  taxPercent: number;
  marginPercent: number;
};

type LineItem = {
  itemId: string;
  quantity: number;
  marginPercent?: number;
};

type QuotationVersionFormProps = {
  onClose: () => void;
  onSuccess: () => void;
  quotationId: string;
  defaultVersion?: string;
};

export function QuotationVersionForm({
  onClose,
  onSuccess,
  quotationId,
  defaultVersion = "1.1",
}: QuotationVersionFormProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [version, setVersion] = useState(defaultVersion);
  const [brand, setBrand] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([{ itemId: "", quantity: 1 }]);
  const [globalMargin, setGlobalMargin] = useState<number | null>(null);
  const [useGlobalMargin, setUseGlobalMargin] = useState(false);

  useEffect(() => {
    fetch("/api/items")
      .then((res) => res.json())
      .then((data) => setItems(data))
      .catch(() => setItems([]));
  }, []);

  const updateLineItem = (
    index: number,
    field: keyof LineItem,
    value: string | number | undefined
  ) => {
    setLineItems((prev) =>
      prev.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line
      )
    );
  };

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { itemId: "", quantity: 1 }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, lineIndex) => lineIndex !== index));
  };

  const applyGlobalMargin = () => {
    if (globalMargin === null) return;
    setLineItems((prev) => prev.map((line) => ({ ...line, marginPercent: globalMargin })));
    setUseGlobalMargin(true);
  };

  const { selectedLines, subtotal, marginTotal, taxTotal, totalValue } = useMemo(() => {
    const lines = lineItems
      .filter((line) => line.itemId)
      .map((line) => {
        const item = items.find((entry) => entry.id === line.itemId);
        const unitPrice = Number(item?.unitPrice || 0);
        const marginPercent = line.marginPercent ?? item?.marginPercent ?? 0;
        const taxPercent = item?.taxPercent || 0;
        const quantity = Number(line.quantity) || 0;
        const baseTotal = unitPrice * quantity;
        const marginAmount = baseTotal * (marginPercent / 100);
        const taxAmount = baseTotal * (taxPercent / 100);
        const lineTotal = baseTotal + marginAmount + taxAmount;
        return { item, quantity, unitPrice, marginPercent, taxPercent, baseTotal, marginAmount, taxAmount, lineTotal };
      });

    const sub = lines.reduce((sum, l) => sum + l.baseTotal, 0);
    const margin = lines.reduce((sum, l) => sum + l.marginAmount, 0);
    const tax = lines.reduce((sum, l) => sum + l.taxAmount, 0);
    const total = lines.reduce((sum, l) => sum + l.lineTotal, 0);

    return { selectedLines: lines, subtotal: sub, marginTotal: margin, taxTotal: tax, totalValue: total };
  }, [lineItems, items]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/quotations/${quotationId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version,
          brand,
          items: lineItems.filter((line) => line.itemId && line.quantity),
        }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage("Unable to create version. Please try again.");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Something went wrong while creating the version.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title="Create New Version"
      subtitle="Capture an alternate quote option for comparison."
      onClose={onClose}
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-solar-ink">Version Label</label>
            <input
              required
              value={version}
              onChange={(event) => setVersion(event.target.value)}
              className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              placeholder="e.g., 1.1"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-solar-ink">Vendor / Brand</label>
            <input
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              placeholder="e.g., Siemens, Adani"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-solar-ink">Line Items</label>

          <div className="mt-2 flex items-center gap-3 rounded-xl border border-solar-border bg-white px-3 py-2">
            <span className="text-sm text-solar-muted">Global Margin %:</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={globalMargin ?? ""}
              onChange={(e) => setGlobalMargin(e.target.value ? Number(e.target.value) : null)}
              placeholder="e.g., 15"
              className="w-20 rounded-lg border border-solar-border bg-solar-sand px-2 py-1 text-sm outline-none"
            />
            <button
              type="button"
              onClick={applyGlobalMargin}
              disabled={globalMargin === null}
              className="rounded-lg bg-solar-amber px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
            >
              Apply to All
            </button>
            {useGlobalMargin && <span className="text-xs text-green-600">✓ Applied</span>}
          </div>

          <div className="mt-3 space-y-3">
            {lineItems.map((line, index) => (
              <div key={`version-line-${index}`} className="rounded-xl border border-solar-border bg-white p-3">
                <div className="flex flex-wrap gap-2">
                  <select
                    value={line.itemId}
                    onChange={(event) => updateLineItem(index, "itemId", event.target.value)}
                    className="flex-1 rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  >
                    <option value="">Select item</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(event) => updateLineItem(index, "quantity", Number(event.target.value))}
                    className="w-20 rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                    placeholder="Qty"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-solar-muted">Margin:</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={line.marginPercent ?? ""}
                      onChange={(event) =>
                        updateLineItem(
                          index,
                          "marginPercent",
                          event.target.value ? Number(event.target.value) : undefined
                        )
                      }
                      placeholder={
                        items.find((i) => i.id === line.itemId)?.marginPercent?.toString() || "0"
                      }
                      className="w-16 rounded-lg border border-solar-border bg-solar-sand px-2 py-1 text-sm outline-none"
                    />
                    <span className="text-xs text-solar-muted">%</span>
                  </div>
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="rounded-xl border border-solar-border bg-white px-3 py-2 text-xs font-semibold text-solar-ink"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {line.itemId && (
                  <div className="mt-2 flex gap-4 text-xs text-solar-muted">
                    <span>
                      Unit: AED {items.find((i) => i.id === line.itemId)?.unitPrice?.toFixed(2) || "0.00"}
                    </span>
                    <span>Tax: {items.find((i) => i.id === line.itemId)?.taxPercent || 0}%</span>
                    <span className="text-solar-ink font-medium">
                      Line Total: AED {selectedLines.find((_, i) => i === index)?.lineTotal?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addLineItem}
              className="rounded-xl border border-solar-border bg-white px-3 py-2 text-xs font-semibold text-solar-ink"
            >
              Add Line Item
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-solar-border bg-solar-sand px-4 py-3 text-sm">
          <div className="flex justify-between">
            <span className="text-solar-muted">Subtotal</span>
            <span className="font-semibold">AED {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-solar-muted">Margin</span>
            <span className="font-semibold">AED {marginTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-solar-muted">Tax</span>
            <span className="font-semibold">AED {taxTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-solar-ink">
            <span className="font-semibold">Grand Total</span>
            <span className="font-semibold">AED {totalValue.toFixed(2)}</span>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-solar-border bg-white py-2 text-sm font-semibold text-solar-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-solar-amber py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Saving..." : "Create Version"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
