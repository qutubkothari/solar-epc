"use client";

import { useState } from "react";
import { ModalShell } from "@/components/modal-shell";

type ItemFormProps = {
  onClose: () => void;
  onSuccess: () => void;
  itemId?: string;
  initialData?: {
    name: string;
    description?: string | null;
    brand?: string | null;
    unitPrice?: number;
    taxPercent?: number;
    marginPercent?: number;
    uom?: string | null;
    category?: string | null;
  };
};

/** Split a stored pipe-separated description into editable desc + warranty parts. */
const splitDescription = (combined?: string | null): { description: string; warranty: string } => {
  if (!combined) return { description: "", warranty: "" };
  const parts = combined.split("|").map((p) => p.trim());
  const warrantyParts: string[] = [];
  const descParts: string[] = [];
  for (const part of parts) {
    if (/warranty/i.test(part)) {
      warrantyParts.push(part.replace(/^warranty\s*:\s*/i, "").trim());
    } else {
      descParts.push(part);
    }
  }
  return {
    description: descParts.join(" | "),
    warranty: warrantyParts.join(" ; "),
  };
};

/** Combine separate description + warranty back into the stored pipe-separated format. */
const combineDescription = (description: string, warranty: string): string | null => {
  const parts = [
    description.trim(),
    warranty.trim() ? `Warranty: ${warranty.trim()}` : "",
  ].filter(Boolean);
  return parts.join(" | ") || null;
};

export function ItemForm({ onClose, onSuccess, itemId, initialData }: ItemFormProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { description: splitDesc, warranty: splitWarranty } = splitDescription(initialData?.description);

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: splitDesc,
    warranty: splitWarranty,
    brand: initialData?.brand || "",
    unitPrice: initialData?.unitPrice?.toString() || "",
    taxPercent: initialData?.taxPercent?.toString() || "5",
    marginPercent: initialData?.marginPercent?.toString() || "10",
    uom: initialData?.uom || "Unit",
    category: initialData?.category || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(itemId ? `/api/items/${itemId}` : "/api/items", {
        method: itemId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: combineDescription(formData.description, formData.warranty),
          brand: formData.brand || null,
          unitPrice: parseFloat(formData.unitPrice),
          taxPercent: parseFloat(formData.taxPercent),
          marginPercent: parseFloat(formData.marginPercent),
          uom: formData.uom,
          category: formData.category,
        }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage("Unable to save item. Please try again.");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Something went wrong while saving the item.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title={itemId ? "Edit BOQ Item" : "Add BOQ Item"}
      subtitle="Define quotation-ready product pricing, margins, and tax rules."
      onClose={onClose}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-solar-ink">Item Name *</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              placeholder="e.g., 550Wp TOPCon Module"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-solar-ink">Description</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none resize-none"
                placeholder="Technical specs, capacity details, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-solar-ink">Warranty</label>
              <textarea
                rows={3}
                value={formData.warranty}
                onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none resize-none"
                placeholder="e.g., 25 years product warranty"
              />
              <p className="mt-1 text-xs text-solar-muted">Stored as &quot;Warranty: ...&quot; in the combined description.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-solar-ink">Brand / Make</label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              placeholder="e.g., Adani, Sungrow, Polycab"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-semibold text-solar-ink">Unit Price (INR) *</label>
              <input
                required
                type="number"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-solar-ink">Margin %</label>
              <input
                type="number"
                step="0.1"
                value={formData.marginPercent}
                onChange={(e) => setFormData({ ...formData, marginPercent: e.target.value })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-solar-ink">Tax %</label>
              <input
                type="number"
                step="0.1"
                value={formData.taxPercent}
                onChange={(e) => setFormData({ ...formData, taxPercent: e.target.value })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-solar-ink">UOM</label>
              <select
                value={formData.uom}
                onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              >
                <option>Unit</option>
                <option>Set</option>
                <option>Meter</option>
                <option>Kg</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-solar-ink">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              />
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
              {loading ? "Saving..." : itemId ? "Save BOQ Item" : "Create BOQ Item"}
            </button>
          </div>
      </form>
    </ModalShell>
  );
}


export function ItemForm({ onClose, onSuccess, itemId, initialData }: ItemFormProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    brand: initialData?.brand || "",
    unitPrice: initialData?.unitPrice?.toString() || "",
    taxPercent: initialData?.taxPercent?.toString() || "5",
    marginPercent: initialData?.marginPercent?.toString() || "10",
    uom: initialData?.uom || "Unit",
    category: initialData?.category || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(itemId ? `/api/items/${itemId}` : "/api/items", {
        method: itemId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          unitPrice: parseFloat(formData.unitPrice),
          taxPercent: parseFloat(formData.taxPercent),
          marginPercent: parseFloat(formData.marginPercent),
          brand: formData.brand || null,
        }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage("Unable to save item. Please try again.");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Something went wrong while saving the item.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title={itemId ? "Edit BOQ Item" : "Add BOQ Item"}
      subtitle="Define quotation-ready product pricing, margins, and tax rules."
      onClose={onClose}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-solar-ink">Item Name *</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              placeholder="e.g., 550Wp TOPCon Module"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-solar-ink">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-solar-ink">Brand / Make</label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              placeholder="e.g., Adani, Sungrow, Polycab"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-semibold text-solar-ink">Unit Price (INR) *</label>
              <input
                required
                type="number"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-solar-ink">Margin %</label>
              <input
                type="number"
                step="0.1"
                value={formData.marginPercent}
                onChange={(e) => setFormData({ ...formData, marginPercent: e.target.value })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-solar-ink">Tax %</label>
              <input
                type="number"
                step="0.1"
                value={formData.taxPercent}
                onChange={(e) => setFormData({ ...formData, taxPercent: e.target.value })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-solar-ink">UOM</label>
              <select
                value={formData.uom}
                onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              >
                <option>Unit</option>
                <option>Set</option>
                <option>Meter</option>
                <option>Kg</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-solar-ink">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              />
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
              {loading ? "Saving..." : itemId ? "Save BOQ Item" : "Create BOQ Item"}
            </button>
          </div>
      </form>
    </ModalShell>
  );
}
