"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/section-header";
import { SolarQuotationForm } from "@/components/solar-quotation-form";
import { QuotationVersionForm } from "@/components/quotation-version-form";
import { ModalShell } from "@/components/modal-shell";
import { SearchableSelect } from "@/components/searchable-select";
import { formatCurrency } from "@/lib/format";

type QuotationVersion = {
  id: string;
  version: string;
  brand?: string | null;
  grandTotal: number;
  isFinal: boolean;
  subtotal: number;
  taxTotal: number;
  marginTotal: number;
  items: {
    id: string;
    quantity: number;
    lineTotal: number;
    item: {
      name: string;
    };
  }[];
};

type Quotation = {
  id: string;
  title: string;
  status: string;
  client: {
    name: string;
  };
  versions: QuotationVersion[];
};

export default function QuotationsPage() {
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showVersionForm, setShowVersionForm] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [compareVersion, setCompareVersion] = useState<QuotationVersion | null>(null);
  const [compareA, setCompareA] = useState<QuotationVersion | null>(null);
  const [compareB, setCompareB] = useState<QuotationVersion | null>(null);
  const [editingQuote, setEditingQuote] = useState<Quotation | null>(null);
  const [editData, setEditData] = useState({ title: "", status: "DRAFT" });

  const fetchQuotes = async () => {
    try {
      const res = await fetch("/api/quotations");
      const data = await res.json();
      setQuotes(data);
    } catch (error) {
      console.error("Failed to fetch quotations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  useEffect(() => {
    if (!selectedQuoteId && quotes.length > 0) {
      setSelectedQuoteId(quotes[0].id);
    }
  }, [quotes, selectedQuoteId]);

  useEffect(() => {
    if (editingQuote) {
      setEditData({
        title: editingQuote.title || "",
        status: editingQuote.status || "DRAFT",
      });
    }
  }, [editingQuote]);

  const handleDeleteQuote = async (id: string) => {
    const confirmDelete = window.confirm("Delete this quotation and all versions?");
    if (!confirmDelete) return;
    const res = await fetch(`/api/quotations/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchQuotes();
      if (selectedQuoteId === id) {
        setSelectedQuoteId(null);
      }
    }
  };

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingQuote) return;
    const res = await fetch(`/api/quotations/${editingQuote.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editData),
    });
    if (res.ok) {
      fetchQuotes();
      setEditingQuote(null);
    }
  };

  const selectedQuote = quotes.find((quote) => quote.id === selectedQuoteId) || quotes[0];
  const latestVersion = selectedQuote?.versions?.[0];
  const quoteOptions = quotes.map((quote) => ({
    value: quote.id,
    label: quote.title,
    subtitle: quote.client.name,
  }));
  const compareReady = Boolean(compareA && compareB);
  const compareDiff = compareReady
    ? Number(compareA?.grandTotal || 0) - Number(compareB?.grandTotal || 0)
    : 0;
  const compareLines = compareReady
    ? (() => {
        const map = new Map<
          string,
          {
            name: string;
            qtyA: number;
            totalA: number;
            qtyB: number;
            totalB: number;
          }
        >();

        (compareA?.items || []).forEach((line) => {
          const key = line.item.name;
          const entry = map.get(key) || {
            name: key,
            qtyA: 0,
            totalA: 0,
            qtyB: 0,
            totalB: 0,
          };
          entry.qtyA += Number(line.quantity || 0);
          entry.totalA += Number(line.lineTotal || 0);
          map.set(key, entry);
        });

        (compareB?.items || []).forEach((line) => {
          const key = line.item.name;
          const entry = map.get(key) || {
            name: key,
            qtyA: 0,
            totalA: 0,
            qtyB: 0,
            totalB: 0,
          };
          entry.qtyB += Number(line.quantity || 0);
          entry.totalB += Number(line.lineTotal || 0);
          map.set(key, entry);
        });

        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
      })()
    : [];

  const exportComparisonCsv = () => {
    if (!compareReady || !compareA || !compareB) return;
    const headers = [
      "Item",
      "Qty A",
      "Total A",
      "Qty B",
      "Total B",
      "Delta (A-B)",
    ];
    const rows = compareLines.map((line) => [
      line.name,
      line.qtyA,
      line.totalA.toFixed(2),
      line.qtyB,
      line.totalB.toFixed(2),
      (line.totalA - line.totalB).toFixed(2),
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `quotation-compare-${compareA.version}-vs-${compareB.version}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const printComparison = () => {
    if (!compareReady || !compareA || !compareB) return;
    const rows = compareLines
      .map(
        (line) => `
          <tr>
            <td>${line.name}</td>
            <td>${line.qtyA || "—"}</td>
            <td>${line.totalA ? formatCurrency(line.totalA) : "—"}</td>
            <td>${line.qtyB || "—"}</td>
            <td>${line.totalB ? formatCurrency(line.totalB) : "—"}</td>
            <td>${formatCurrency(line.totalA - line.totalB)}</td>
          </tr>
        `
      )
      .join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Quotation Comparison</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 18px; margin-bottom: 8px; }
            h2 { font-size: 14px; margin: 0 0 16px; color: #4b5563; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
            th { background: #f3f4f6; }
            .summary { margin-top: 16px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Quotation Comparison</h1>
          <h2>Option A: ${compareA.version} ${compareA.brand ? `• ${compareA.brand}` : ""}</h2>
          <h2>Option B: ${compareB.version} ${compareB.brand ? `• ${compareB.brand}` : ""}</h2>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty A</th>
                <th>Total A</th>
                <th>Qty B</th>
                <th>Total B</th>
                <th>Delta (A-B)</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div class="summary">
            <strong>Difference (A - B):</strong> ${formatCurrency(compareDiff)}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleComparePick = (version: QuotationVersion) => {
    if (!compareA || (compareA && compareB)) {
      setCompareA(version);
      setCompareB(null);
      return;
    }
    if (compareA && !compareB && compareA.id !== version.id) {
      setCompareB(version);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Quotation Engine"
        subtitle="Create, version, and compare quotations with real-time pricing."
        action={
          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white"
          >
            New Quotation
          </button>
        }
      />

      <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
        <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <div className="rounded-xl border border-solar-border bg-solar-sand p-4">
            <p className="text-sm font-semibold text-solar-ink">Quote Builder</p>
            <p className="text-xs text-solar-muted mt-1">
              Select items, adjust margin, and generate the internal PDF.
            </p>
            {quotes.length > 0 && (
              <div className="mt-4">
                <label className="text-xs font-semibold text-solar-muted">Select Quotation</label>
                <div className="mt-2">
                  <SearchableSelect
                    value={selectedQuoteId || ""}
                    options={quoteOptions}
                    onChange={(value) => setSelectedQuoteId(value)}
                    placeholder="Select quotation"
                    searchPlaceholder="Search quotations"
                  />
                </div>
              </div>
            )}
            <div className="mt-4 space-y-2 text-xs text-solar-muted">
              {latestVersion?.items?.length ? (
                latestVersion.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg bg-white px-3 py-2"
                  >
                    <span>
                      {item.item.name} x {item.quantity}
                    </span>
                    <span>{formatCurrency(Number(item.lineTotal))}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-lg bg-white px-3 py-2 text-solar-muted">
                  No line items yet. Add items when creating a quotation.
                </div>
              )}
            </div>
            <button
              onClick={() => {
                if (selectedQuote) {
                  window.open(`/api/quotations/${selectedQuote.id}/pdf`, "_blank");
                }
              }}
              disabled={!selectedQuote}
              className="mt-4 w-full rounded-xl bg-solar-forest py-2 text-sm font-semibold text-white"
            >
              Download PDF
            </button>
            {selectedQuote && (
              <button
                onClick={() => setShowVersionForm(true)}
                className="mt-2 w-full rounded-xl border border-solar-border bg-white py-2 text-sm font-semibold text-solar-ink"
              >
                Add New Version
              </button>
            )}
          </div>

          <div className="rounded-xl border border-solar-border bg-white p-4">
            <p className="text-sm font-semibold text-solar-ink">Versioning</p>
            <p className="text-xs text-solar-muted mt-1">
              Preserve every iteration with final approval flag.
            </p>
            <div className="mt-4 space-y-2 text-xs">
              {!selectedQuote?.versions?.length ? (
                <div className="text-solar-muted">No versions yet.</div>
              ) : (
                selectedQuote.versions
                  .slice(0, 5)
                  .map((version) => (
                    <div
                      key={version.id}
                      className="flex items-center justify-between rounded-lg border border-solar-border px-3 py-2"
                    >
                      <span className="font-semibold text-solar-ink">
                        {version.version} {version.brand ? `• ${version.brand}` : ""} {version.isFinal ? "(Final)" : ""}
                      </span>
                      <button
                        onClick={() => handleComparePick(version)}
                        className="text-solar-forest"
                      >
                        {compareA?.id === version.id
                          ? "Selected A"
                          : compareB?.id === version.id
                          ? "Selected B"
                          : "Pick"}
                      </button>
                    </div>
                  ))
              )}
            </div>
            {compareReady && (
              <button
                onClick={() => setCompareVersion(compareA)}
                className="mt-3 w-full rounded-xl bg-solar-forest py-2 text-xs font-semibold text-white"
              >
                Open Comparison
              </button>
            )}
            {(compareA || compareB) && (
              <button
                onClick={() => {
                  setCompareA(null);
                  setCompareB(null);
                }}
                className="mt-2 w-full rounded-xl border border-solar-border bg-white py-2 text-xs font-semibold text-solar-ink"
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-solar-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-solar-sand text-xs uppercase tracking-wider text-solar-muted">
              <tr>
                <th className="px-4 py-3">Quote ID</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-solar-muted">
                    Loading...
                  </td>
                </tr>
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-solar-muted">
                    No quotations yet.
                  </td>
                </tr>
              ) : (
                quotes.map((quote) => {
                  const latestVersion = quote.versions[0];
                  return (
                    <tr key={quote.id} className="border-t border-solar-border">
                      <td className="px-4 py-3 font-medium text-solar-ink">
                        {quote.title}
                      </td>
                      <td className="px-4 py-3 text-solar-muted">{quote.client.name}</td>
                      <td className="px-4 py-3 text-solar-muted">
                        {latestVersion?.version || "—"}
                      </td>
                      <td className="px-4 py-3 text-solar-muted">
                        {formatCurrency(Number(latestVersion?.grandTotal || 0))}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-solar-sky px-3 py-1 text-xs font-semibold text-solar-forest">
                          {quote.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => window.open(`/api/quotations/${quote.id}/pdf`, "_blank")}
                            className="rounded-lg border border-solar-border bg-white px-3 py-1 text-xs font-semibold text-solar-ink"
                          >
                            View
                          </button>
                          <button
                            onClick={() => setEditingQuote(quote)}
                            className="rounded-lg border border-solar-border bg-white px-3 py-1 text-xs font-semibold text-solar-ink"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteQuote(quote.id)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <SolarQuotationForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            fetchQuotes();
            setShowForm(false);
          }}
        />
      )}

      {compareVersion && (
        <ModalShell
          title="Version Comparison"
          subtitle={compareReady ? "Compare two options" : `Version ${compareVersion.version} summary`}
          onClose={() => setCompareVersion(null)}
          size="2xl"
        >
          {compareReady ? (
            <div className="space-y-4 text-sm text-solar-ink">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-solar-border bg-solar-sand px-4 py-3">
                  <p className="text-xs text-solar-muted">Option A</p>
                  <p className="text-sm font-semibold">
                    {compareA?.version} {compareA?.brand ? `• ${compareA.brand}` : ""}
                  </p>
                  <div className="mt-2 flex justify-between">
                    <span>Total</span>
                    <span className="font-semibold">{formatCurrency(Number(compareA?.grandTotal || 0))}</span>
                  </div>
                </div>
                <div className="rounded-xl border border-solar-border bg-solar-sand px-4 py-3">
                  <p className="text-xs text-solar-muted">Option B</p>
                  <p className="text-sm font-semibold">
                    {compareB?.version} {compareB?.brand ? `• ${compareB.brand}` : ""}
                  </p>
                  <div className="mt-2 flex justify-between">
                    <span>Total</span>
                    <span className="font-semibold">{formatCurrency(Number(compareB?.grandTotal || 0))}</span>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-solar-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-solar-sand text-[11px] uppercase tracking-wider text-solar-muted">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2">Qty A</th>
                      <th className="px-3 py-2">Total A</th>
                      <th className="px-3 py-2">Qty B</th>
                      <th className="px-3 py-2">Total B</th>
                      <th className="px-3 py-2">Delta (A-B)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareLines.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-3 text-center text-solar-muted"
                        >
                          No line items to compare.
                        </td>
                      </tr>
                    ) : (
                      compareLines.map((line) => {
                        const delta = line.totalA - line.totalB;
                        return (
                          <tr key={line.name} className="border-t border-solar-border">
                            <td className="px-3 py-2 font-medium text-solar-ink">{line.name}</td>
                            <td className="px-3 py-2 text-solar-muted">{line.qtyA || "—"}</td>
                            <td className="px-3 py-2 text-solar-muted">
                              {line.totalA ? formatCurrency(line.totalA) : "—"}
                            </td>
                            <td className="px-3 py-2 text-solar-muted">{line.qtyB || "—"}</td>
                            <td className="px-3 py-2 text-solar-muted">
                              {line.totalB ? formatCurrency(line.totalB) : "—"}
                            </td>
                            <td
                              className={`px-3 py-2 font-semibold ${
                                delta >= 0 ? "text-solar-forest" : "text-red-600"
                              }`}
                            >
                              {formatCurrency(delta)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between rounded-xl border border-solar-border bg-white px-4 py-3">
                <span className="font-semibold">Difference (A - B)</span>
                <span className={`font-semibold ${compareDiff >= 0 ? "text-solar-forest" : "text-red-600"}`}>
                  {formatCurrency(compareDiff)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={exportComparisonCsv}
                  className="rounded-xl border border-solar-border bg-white px-4 py-2 text-xs font-semibold text-solar-ink"
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={printComparison}
                  className="rounded-xl bg-solar-forest px-4 py-2 text-xs font-semibold text-white"
                >
                  Print Comparison
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-solar-ink">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(Number(compareVersion.subtotal || 0))}</span>
              </div>
              <div className="flex justify-between">
                <span>Margin</span>
                <span>{formatCurrency(Number(compareVersion.marginTotal || 0))}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatCurrency(Number(compareVersion.taxTotal || 0))}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Grand Total</span>
                <span>{formatCurrency(Number(compareVersion.grandTotal || 0))}</span>
              </div>
            </div>
          )}
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setCompareVersion(null)}
              className="flex-1 rounded-xl border border-solar-border bg-white py-2 text-sm font-semibold text-solar-ink"
            >
              Close
            </button>
          </div>
        </ModalShell>
      )}

      {showVersionForm && selectedQuote && (
        <QuotationVersionForm
          quotationId={selectedQuote.id}
          onClose={() => setShowVersionForm(false)}
          onSuccess={() => {
            fetchQuotes();
            setShowVersionForm(false);
          }}
        />
      )}

      {editingQuote && (
        <ModalShell
          title="Edit Quotation"
          subtitle="Update quotation title and status."
          onClose={() => setEditingQuote(null)}
          size="md"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-solar-ink">Title</label>
              <input
                value={editData.title}
                onChange={(event) => setEditData({ ...editData, title: event.target.value })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-solar-ink">Status</label>
              <select
                value={editData.status}
                onChange={(event) => setEditData({ ...editData, status: event.target.value })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              >
                <option value="DRAFT">Draft</option>
                <option value="FINAL">Final</option>
                <option value="APPROVED">Approved</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingQuote(null)}
                className="flex-1 rounded-xl border border-solar-border bg-white py-2 text-sm font-semibold text-solar-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-solar-amber py-2 text-sm font-semibold text-white"
              >
                Save
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
