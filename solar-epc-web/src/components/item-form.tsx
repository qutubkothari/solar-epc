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
    unitPrice?: number;
    taxPercent?: number;
    marginPercent?: number;
    uom?: string | null;
    category?: string | null;
  };
};

export function ItemForm({ onClose, onSuccess, itemId, initialData }: ItemFormProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
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
      title={itemId ? "Edit Item" : "Add New Item"}
      subtitle="Define product pricing, margins, and tax rules."
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
              placeholder="e.g., 550W Mono Panel"
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
              {loading ? "Saving..." : itemId ? "Save Item" : "Create Item"}
            </button>
          </div>
      </form>
    </ModalShell>
  );
}
