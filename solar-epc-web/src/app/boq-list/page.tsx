"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { LayoutGrid, Rows3 } from "lucide-react";
import { PaginationControls } from "@/components/pagination-controls";
import { SectionHeader } from "@/components/section-header";
import { formatCurrency } from "@/lib/format";
import { usePagination } from "@/hooks/use-pagination";
import { ItemForm } from "@/components/item-form";
import { ModalShell } from "@/components/modal-shell";
import {
  getBoqDisplayParts,
  inferSelectionUnit,
  resolveBoqItemHead,
  SOLAR_BOQ_SEQUENCE,
  type SolarBoqItem,
} from "@/lib/solar-boq";

type BoqListItem = SolarBoqItem & {
  itemHead: string;
  sequence: number;
  itemType: string;
  ratingOrCapacity: string;
  selectionUnit: string;
  isMapped: boolean;
};

export default function BoqListPage() {
  const [items, setItems] = useState<SolarBoqItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<BoqListItem | null>(null);
  const [viewItem, setViewItem] = useState<BoqListItem | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [boqHeadFilter, setBoqHeadFilter] = useState("all");
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

  const boqItems = useMemo<BoqListItem[]>(() => {
    return items
      .map((item) => {
        const resolvedHead = resolveBoqItemHead(item);
        const display = getBoqDisplayParts(item);
        const sequence = SOLAR_BOQ_SEQUENCE.find((entry) => entry.itemHead === resolvedHead)?.sequence ?? 999;

        return {
          ...item,
          itemHead: resolvedHead || "UNMAPPED ITEMS",
          sequence,
          itemType: display.itemType || item.name,
          ratingOrCapacity: display.ratingOrCapacity,
          selectionUnit: inferSelectionUnit(item),
          isMapped: Boolean(resolvedHead),
        };
      })
      .sort((left, right) => {
        if (left.sequence !== right.sequence) {
          return left.sequence - right.sequence;
        }
        return `${left.itemType} ${left.brand || ""}`.localeCompare(`${right.itemType} ${right.brand || ""}`);
      });
  }, [items]);

  const boqHeadOptions = useMemo(() => {
    const headMap = new Map<string, number>();
    boqItems.forEach((item) => {
      headMap.set(item.itemHead, item.sequence);
    });

    return Array.from(headMap.entries())
      .sort((left, right) => left[1] - right[1] || left[0].localeCompare(right[0]))
      .map(([itemHead]) => itemHead);
  }, [boqItems]);

  const filteredItems = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return boqItems.filter((item) => {
      const matchesSearch =
        !search ||
        item.name.toLowerCase().includes(search) ||
        item.itemHead.toLowerCase().includes(search) ||
        item.itemType.toLowerCase().includes(search) ||
        item.ratingOrCapacity.toLowerCase().includes(search) ||
        (item.description || "").toLowerCase().includes(search) ||
        (item.category || "").toLowerCase().includes(search) ||
        (item.brand || "").toLowerCase().includes(search);
      const matchesBoqHead = boqHeadFilter === "all" || item.itemHead === boqHeadFilter;
      return matchesSearch && matchesBoqHead;
    });
  }, [boqItems, searchTerm, boqHeadFilter]);

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    pageSize,
    startItem,
    endItem,
    paginatedItems,
  } = usePagination(filteredItems, {
    pageSize: 10,
    resetKey: `${searchTerm}|${boqHeadFilter}|${items.length}`,
  });

  const groupedItems = useMemo(() => {
    const groups = new Map<string, { itemHead: string; sequence: number; isMapped: boolean; items: BoqListItem[] }>();

    paginatedItems.forEach((item) => {
      const existing = groups.get(item.itemHead);
      if (existing) {
        existing.items.push(item);
        return;
      }

      groups.set(item.itemHead, {
        itemHead: item.itemHead,
        sequence: item.sequence,
        isMapped: item.isMapped,
        items: [item],
      });
    });

    return Array.from(groups.values()).sort(
      (left, right) => left.sequence - right.sequence || left.itemHead.localeCompare(right.itemHead)
    );
  }, [paginatedItems]);

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
        title="BOQ List"
        subtitle="Review the same BOQ-ready item mapping and pricing used in quotation preparation."
        action={
          <button
            onClick={() => {
              setEditingItem(null);
              setShowForm(true);
            }}
            className="rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white"
          >
            Add BOQ Item
          </button>
        }
      />

      <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            className="w-full max-w-xs rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
            placeholder="Search BOQ items"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <select
            value={boqHeadFilter}
            onChange={(event) => setBoqHeadFilter(event.target.value)}
            className="rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm text-solar-ink"
          >
            <option value="all">All BOQ Heads</option>
            {boqHeadOptions.map((itemHead) => (
              <option key={itemHead} value={itemHead}>
                {itemHead}
              </option>
            ))}
          </select>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-xl border border-solar-border bg-solar-sand p-1">
              <button
                type="button"
                onClick={() => setViewMode("card")}
                className={viewMode === "card" ? "rounded-lg bg-white px-3 py-2 text-sm font-semibold text-solar-ink shadow-sm" : "rounded-lg px-3 py-2 text-sm font-medium text-solar-muted"}
                aria-pressed={viewMode === "card"}
              >
                <span className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Card View
                </span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={viewMode === "table" ? "rounded-lg bg-white px-3 py-2 text-sm font-semibold text-solar-ink shadow-sm" : "rounded-lg px-3 py-2 text-sm font-medium text-solar-muted"}
                aria-pressed={viewMode === "table"}
              >
                <span className="flex items-center gap-2">
                  <Rows3 className="h-4 w-4" />
                  Table View
                </span>
              </button>
            </div>
            <button
              onClick={handleImportClick}
              className="rounded-xl border border-solar-border px-3 py-2 text-sm text-solar-ink"
            >
              Import CSV
            </button>
          </div>
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
        ) : filteredItems.length === 0 ? (
          <div className="mt-6 text-center text-sm text-solar-muted">
            No BOQ items match your filters.
          </div>
        ) : viewMode === "card" ? (
          <div className="mt-6 space-y-5">
            {groupedItems.map((group) => (
              <section key={group.itemHead} className="rounded-2xl border border-solar-border bg-solar-sand/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-solar-border pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold tracking-wide text-solar-muted">
                        {group.sequence === 999 ? "UNMAPPED" : `BOQ ${String(group.sequence).padStart(2, "0")}`}
                      </span>
                      {!group.isMapped && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                          Not used in quotation mapping yet
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-solar-ink">{group.itemHead}</h3>
                    <p className="mt-1 text-xs text-solar-muted">
                      {group.items.length} item{group.items.length === 1 ? "" : "s"} available for quotation selection.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((item) => (
                    <div key={item.id} className="rounded-xl border border-solar-border bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-solar-ink">{item.itemType}</p>
                          {item.ratingOrCapacity && (
                            <p className="mt-1 text-xs font-medium text-solar-amber">{item.ratingOrCapacity}</p>
                          )}
                        </div>
                        <span className="rounded-full bg-solar-sand px-2 py-0.5 text-[10px] font-semibold text-solar-muted">
                          {item.selectionUnit}
                        </span>
                      </div>
                      {item.brand && <p className="mt-2 text-xs font-medium text-solar-ink">{item.brand}</p>}
                      {item.description && (
                        <p className="mt-1 text-xs text-solar-muted line-clamp-3">{item.description}</p>
                      )}
                      <div className="mt-3 space-y-1 text-xs text-solar-muted">
                        <p>Catalogue Name: {item.name}</p>
                        <p>Source Category: {item.category || "—"}</p>
                        <p>Unit Price: {formatCurrency(Number(item.unitPrice))}</p>
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
              </section>
            ))}
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-solar-border">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-solar-border text-sm">
                <thead className="bg-solar-sand text-left text-xs font-semibold uppercase tracking-wide text-solar-muted">
                  <tr>
                    <th className="px-4 py-3">Seq</th>
                    <th className="px-4 py-3">BOQ Head</th>
                    <th className="px-4 py-3">Item Type</th>
                    <th className="px-4 py-3">Rating / Capacity</th>
                    <th className="px-4 py-3">Brand</th>
                    <th className="px-4 py-3">Unit Price</th>
                    <th className="px-4 py-3">Tax</th>
                    <th className="px-4 py-3">Quotation Unit</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-solar-border bg-white text-solar-ink">
                  {paginatedItems.map((item) => (
                    <tr key={item.id} className="align-top">
                      <td className="px-4 py-4 text-solar-muted">
                        {item.sequence === 999 ? "—" : String(item.sequence).padStart(2, "0")}
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-solar-ink">{item.itemHead}</p>
                          {!item.isMapped && (
                            <p className="text-xs text-amber-700">Not currently matched into the quotation BOQ sequence</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-solar-ink">{item.itemType}</p>
                          <p className="max-w-md text-xs text-solar-muted">{item.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-solar-muted">{item.ratingOrCapacity || "—"}</td>
                      <td className="px-4 py-4 text-solar-muted">{item.brand || "—"}</td>
                      <td className="px-4 py-4 font-medium">{formatCurrency(Number(item.unitPrice))}</td>
                      <td className="px-4 py-4 text-solar-muted">{Number(item.taxPercent).toFixed(1)}%</td>
                      <td className="px-4 py-4 text-solar-muted">{item.selectionUnit}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setViewItem(item)}
                            className="rounded-lg border border-solar-border bg-white px-3 py-2 text-xs font-semibold text-solar-ink"
                          >
                            View
                          </button>
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setShowForm(true);
                            }}
                            className="rounded-lg border border-solar-border bg-white px-3 py-2 text-xs font-semibold text-solar-ink"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          startItem={startItem}
          endItem={endItem}
          onPageChange={setCurrentPage}
          itemLabel="BOQ items"
        />
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
          title="BOQ Item Details"
          subtitle={viewItem.itemHead}
          onClose={() => setViewItem(null)}
          size="md"
        >
          <div className="space-y-2 text-sm text-solar-ink">
            <div className="flex justify-between gap-4">
              <span className="text-solar-muted">Item Type</span>
              <span className="font-semibold text-right">{viewItem.itemType}</span>
            </div>
            {viewItem.ratingOrCapacity && (
              <div className="flex justify-between gap-4">
                <span className="text-solar-muted">Rating / Capacity</span>
                <span className="font-semibold text-right">{viewItem.ratingOrCapacity}</span>
              </div>
            )}
            {viewItem.category && (
              <div className="flex justify-between">
                <span className="text-solar-muted">Source Category</span>
                <span className="font-semibold">{viewItem.category}</span>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="text-solar-muted">Catalogue Name</span>
              <span className="font-semibold text-right">{viewItem.name}</span>
            </div>
            {viewItem.brand && (
              <div className="flex justify-between">
                <span className="text-solar-muted">Brand / Make</span>
                <span className="font-semibold">{viewItem.brand}</span>
              </div>
            )}
            {viewItem.description && (
              <div className="flex justify-between gap-4">
                <span className="text-solar-muted">Description</span>
                <span className="font-semibold text-right">{viewItem.description}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-solar-muted">Quotation Unit</span>
              <span className="font-semibold">{viewItem.selectionUnit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-solar-muted">Unit Price</span>
              <span className="font-semibold">{formatCurrency(Number(viewItem.unitPrice))}</span>
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