"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/section-header";
import { SolarQuotationForm } from "@/components/solar-quotation-form";
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
  clientId: string;
  client: {
    name: string;
  };
  versions: QuotationVersion[];
};

export default function QuotationsPage() {
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newVersionForQuote, setNewVersionForQuote] = useState<Quotation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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

  // Filter quotes by search query (client name or title)
  const filteredQuotes = quotes.filter((quote) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      quote.title.toLowerCase().includes(search) ||
      quote.client.name.toLowerCase().includes(search)
    );
  });

  const selectedQuote = quotes.find((quote) => quote.id === selectedQuoteId);
  
  // Calculate next version for a quotation
  const getNextVersion = (quote: Quotation | null) => {
    if (!quote) return "1.0";
    const versions = quote.versions || [];
    if (versions.length === 0) return "1.0";
    const parsed = versions
      .map((v) => {
        const match = String(v.version || "").match(/^(\d+)(?:\.(\d+))?/);
        if (!match) return null;
        return { major: Number(match[1]), minor: Number(match[2] ?? 0) };
      })
      .filter(Boolean) as Array<{ major: number; minor: number }>;
    if (parsed.length === 0) return "1.1";
    const max = parsed.reduce((acc, cur) => {
      if (cur.major > acc.major) return cur;
      if (cur.major === acc.major && cur.minor > acc.minor) return cur;
      return acc;
    }, parsed[0]);
    return `${max.major}.${max.minor + 1}`;
  };
  
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
        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by client name or quotation title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-solar-border bg-solar-sand px-4 py-2 text-sm outline-none focus:border-solar-amber"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-solar-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-solar-sand text-xs uppercase tracking-wider text-solar-muted">
              <tr>
                <th className="px-4 py-3">Quote ID</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Versions</th>
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
              ) : filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-solar-muted">
                    {searchQuery ? "No quotations match your search." : "No quotations yet."}
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((quote) => {
                  const latestVersion = quote.versions[0];
                  const isExpanded = selectedQuoteId === quote.id;
                  return (
                    <>
                      <tr key={quote.id} className="border-t border-solar-border hover:bg-solar-sand/50 cursor-pointer" onClick={() => setSelectedQuoteId(isExpanded ? null : quote.id)}>
                        <td className="px-4 py-3 font-medium text-solar-ink">
                          <div className="flex items-center gap-2">
                            <span className="text-solar-muted">{isExpanded ? "▼" : "▶"}</span>
                            {quote.title}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-solar-muted">{quote.client.name}</td>
                        <td className="px-4 py-3 text-solar-muted">
                          {quote.versions.length} version(s)
                        </td>
                        <td className="px-4 py-3 font-medium text-solar-ink">
                          {formatCurrency(Number(latestVersion?.grandTotal || 0))}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            quote.status === "WON" ? "bg-green-100 text-green-800" :
                            quote.status === "LOST" ? "bg-red-100 text-red-800" :
                            "bg-solar-sky text-solar-forest"
                          }`}>
                            {quote.status}
                          </span>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setNewVersionForQuote(quote)}
                              className="rounded-lg bg-solar-amber px-3 py-1 text-xs font-semibold text-white"
                            >
                              + Version
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
                      {/* Expanded version rows */}
                      {isExpanded && quote.versions.map((version) => (
                        <tr key={version.id} className="bg-solar-sand/30">
                          <td className="px-4 py-2 pl-10 text-sm text-solar-muted">
                            └ v{version.version} {version.brand ? `• ${version.brand}` : ""} {version.isFinal ? "(Final)" : ""}
                          </td>
                          <td className="px-4 py-2 text-xs text-solar-muted">
                            {version.items?.length || 0} items
                          </td>
                          <td className="px-4 py-2"></td>
                          <td className="px-4 py-2 text-sm text-solar-ink">
                            {formatCurrency(Number(version.grandTotal))}
                          </td>
                          <td className="px-4 py-2"></td>
                          <td className="px-4 py-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setCompareVersion(version)}
                                className="text-xs text-solar-forest hover:underline"
                              >
                                View Details
                              </button>
                              <button
                                onClick={() => window.open(`/api/quotations/${quote.id}/pdf?version=${version.id}`, "_blank")}
                                className="text-xs text-solar-amber hover:underline"
                              >
                                PDF
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </>
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
            <div className="space-y-4 text-sm text-solar-ink">
              {/* Items Table */}
              <div className="overflow-hidden rounded-xl border border-solar-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-solar-sand text-[11px] uppercase tracking-wider text-solar-muted">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Rate</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareVersion.items?.length ? (
                      compareVersion.items.map((item) => (
                        <tr key={item.id} className="border-t border-solar-border">
                          <td className="px-3 py-2 text-solar-ink">{item.item.name}</td>
                          <td className="px-3 py-2 text-right text-solar-muted">{Number(item.quantity)}</td>
                          <td className="px-3 py-2 text-right text-solar-muted">{formatCurrency(Number(item.lineTotal) / Number(item.quantity))}</td>
                          <td className="px-3 py-2 text-right font-medium text-solar-ink">{formatCurrency(Number(item.lineTotal))}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-3 py-3 text-center text-solar-muted">No items</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Totals */}
              <div className="rounded-xl border border-solar-border bg-solar-sand p-3 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(Number(compareVersion.subtotal || 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Margin</span>
                  <span>{formatCurrency(Number(compareVersion.marginTotal || 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (GST)</span>
                  <span>{formatCurrency(Number(compareVersion.taxTotal || 0))}</span>
                </div>
                <div className="flex justify-between font-semibold text-solar-forest pt-2 border-t border-solar-border">
                  <span>Grand Total</span>
                  <span>{formatCurrency(Number(compareVersion.grandTotal || 0))}</span>
                </div>
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

      {/* New Version Form - uses same SolarQuotationForm with pre-filled data */}
      {newVersionForQuote && (
        <SolarQuotationForm
          quotationId={newVersionForQuote.id}
          defaultClientId={newVersionForQuote.clientId}
          defaultTitle={newVersionForQuote.title}
          defaultVersion={getNextVersion(newVersionForQuote)}
          clientName={newVersionForQuote.client.name}
          onClose={() => setNewVersionForQuote(null)}
          onSuccess={() => {
            fetchQuotes();
            setNewVersionForQuote(null);
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
                <option value="WON">Won (Order Received)</option>
                <option value="LOST">Lost</option>
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
