"use client";

import { useState, useEffect, useRef } from "react";
import { SectionHeader } from "@/components/section-header";
import { ItemForm } from "@/components/item-form";
import { ModalShell } from "@/components/modal-shell";

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
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [viewItem, setViewItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (rows.length < 2) return;

    const headers = rows[0].split(",").map((header) => header.trim().toLowerCase());
    const itemsToCreate = rows.slice(1).map((row) => {
      const values = row.split(",");
      const entry: Record<string, string> = {};
      headers.forEach((header, index) => {
        entry[header] = values[index]?.trim() || "";
      });
      return {
        name: entry.name || "",
        description: entry.description || "",
        unitPrice: Number(entry.unitprice || entry.unit_price || 0),
        taxPercent: Number(entry.taxpercent || entry.tax_percent || 0),
        marginPercent: Number(entry.marginpercent || entry.margin_percent || 0),
        uom: entry.uom || "Unit",
        category: entry.category || "",
      };
    });

    await Promise.all(
      itemsToCreate
        .filter((item) => item.name)
        .map((item) =>
          fetch("/api/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
          })
        )
    );

    fetchItems();
    event.target.value = "";
  };

  const handleDeleteItem = async (id: string) => {
    const confirmDelete = window.confirm("Delete this item?");
    if (!confirmDelete) return;
    const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchItems();
      if (viewItem?.id === id) setViewItem(null);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Item Master"
        subtitle="Manage standardized pricing, margin defaults, and tax rules."
        action={
          <button
            onClick={() => {
              setEditingItem(null);
              setShowForm(true);
            }}
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
          <button
            onClick={handleImportClick}
            className="rounded-xl border border-solar-border px-3 py-2 text-sm text-solar-ink"
          >
            Import CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImportFile}
          />
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
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => setViewItem(item)}
                    className="flex-1 rounded-xl border border-solar-border bg-white py-2 text-xs font-semibold text-solar-ink"
                  >
                    View
                  </button>
                  <button
                    onClick={() => {
                      setEditingItem(item);
                      setShowForm(true);
                    }}
                    className="flex-1 rounded-xl border border-solar-border bg-white py-2 text-xs font-semibold text-solar-ink"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="flex-1 rounded-xl border border-red-200 bg-red-50 py-2 text-xs font-semibold text-red-700"
                  >
                    Delete
                  </button>
                </div>
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
          itemId={editingItem?.id}
          initialData={editingItem ?? undefined}
        />
      )}

      {viewItem && (
        <ModalShell
          title="Item Details"
          subtitle={viewItem.name}
          onClose={() => setViewItem(null)}
          size="md"
        >
          <div className="space-y-2 text-sm text-solar-ink">
            <div className="flex justify-between">
              <span className="text-solar-muted">Unit Price</span>
              <span className="font-semibold">AED {Number(viewItem.unitPrice).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-solar-muted">Margin</span>
              <span className="font-semibold">{Number(viewItem.marginPercent).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-solar-muted">Tax</span>
              <span className="font-semibold">{Number(viewItem.taxPercent).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-solar-muted">UOM</span>
              <span className="font-semibold">{viewItem.uom || "—"}</span>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
