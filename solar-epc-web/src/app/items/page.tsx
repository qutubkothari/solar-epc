"use client";

import { useState, useEffect } from "react";
import { SectionHeader } from "@/components/section-header";
import { ItemForm } from "@/components/item-form";

type Item = {
  id: string;
  name: string;
  unitPrice: number;
  marginPercent: number;
  taxPercent: number;
  uom: string | null;
};

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/items");
      const data = await res.json();
      setItems(data);
    } catch (error) {
      console.error("Failed to fetch items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Item Master"
        subtitle="Manage standardized pricing, margin defaults, and tax rules."
        action={
          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white"
          >
            Add Item
          </button>
        }
      />

      <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            className="w-full max-w-xs rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
            placeholder="Search items"
          />
          <button className="rounded-xl border border-solar-border px-3 py-2 text-sm text-solar-ink">
            Import CSV
          </button>
        </div>

        {loading ? (
          <div className="mt-6 text-center text-sm text-solar-muted">Loading...</div>
        ) : items.length === 0 ? (
          <div className="mt-6 text-center text-sm text-solar-muted">
            No items yet. Add your first item to build the pricing master.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-solar-border bg-solar-sand p-4"
              >
                <p className="text-sm font-semibold text-solar-ink">{item.name}</p>
                <div className="mt-3 space-y-1 text-xs text-solar-muted">
                  <p>Unit Price: AED {Number(item.unitPrice).toFixed(2)}</p>
                  <p>Margin: {Number(item.marginPercent).toFixed(1)}%</p>
                  <p>Tax: {Number(item.taxPercent).toFixed(1)}%</p>
                  <p>UOM: {item.uom || "—"}</p>
                </div>
                <button className="mt-4 w-full rounded-xl border border-solar-border bg-white py-2 text-xs font-semibold text-solar-ink">
                  Edit Item
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <ItemForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            fetchItems();
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}
