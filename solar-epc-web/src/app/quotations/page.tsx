"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { PaginationControls } from "@/components/pagination-controls";
import { SectionHeader } from "@/components/section-header";
import { SortableTableHeader } from "@/components/sortable-table-header";
import { SolarQuotationForm } from "@/components/solar-quotation-form";
import { ModalShell } from "@/components/modal-shell";
import { usePagination } from "@/hooks/use-pagination";
import { useSortableData } from "@/hooks/use-sortable-data";
import { formatCurrency } from "@/lib/format";
import { normalizeQuotationDocumentData, type QuotationDocumentData } from "@/lib/quotation-document";
import { getBoqDisplayParts, resolveBoqItemHead } from "@/lib/solar-boq";

type QuotationVersion = {
  id: string;
  version: string;
  brand?: string | null;
  documentData?: QuotationDocumentData | null;
  grandTotal: number;
  isFinal: boolean;
  subtotal: number;
  taxTotal: number;
  marginTotal: number;
  items: {
    id: string;
    quantity: number;
    rate?: number;
    description?: string | null;
    lineTotal: number;
    item: {
      id: string;
      name: string;
      description?: string | null;
      brand?: string | null;
      unitPrice?: number;
      taxPercent?: number;
      marginPercent?: number;
      uom?: string | null;
      category?: string | null;
      pricingUnit?: string | null;
    };
  }[];
};

type Quotation = {
  id: string;
  title: string;
  status: string;
  clientId: string;
  inquiryId?: string | null;
  finalVersionId?: string | null;
  client: {
    name: string;
  };
  inquiry?: {
    id: string;
    title: string;
  } | null;
  versions: QuotationVersion[];
};

type QuotationSortKey = "title" | "client" | "versions" | "total" | "status";

export default function QuotationsPage() {
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newVersionForQuote, setNewVersionForQuote] = useState<Quotation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [compareVersion, setCompareVersion] = useState<QuotationVersion | null>(null);
  const [editingQuote, setEditingQuote] = useState<Quotation | null>(null);

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

  const handleMarkFinal = async (quoteId: string, versionId: string) => {
    const res = await fetch(`/api/quotations/${quoteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ finalVersionId: versionId }),
    });

    if (res.ok) {
      fetchQuotes();
    }
  };

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

  const filteredQuotes = useMemo(() => {
    if (!searchQuery) return quotes;
    const search = searchQuery.toLowerCase();
    return quotes.filter((quote) => {
      return (
        quote.title.toLowerCase().includes(search) ||
        quote.client.name.toLowerCase().includes(search)
      );
    });
  }, [quotes, searchQuery]);

  const { sortedItems, sortConfig, requestSort } = useSortableData<Quotation, QuotationSortKey>(filteredQuotes, {
    accessors: {
      title: (quote) => quote.title,
      client: (quote) => quote.client.name,
      versions: (quote) => quote.versions.length,
      total: (quote) => Number(quote.versions[0]?.grandTotal || 0),
      status: (quote) => quote.status,
    },
  });

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    pageSize,
    startItem,
    endItem,
    paginatedItems: paginatedQuotes,
  } = usePagination(sortedItems, {
    pageSize: 10,
    resetKey: `${searchQuery}|${quotes.length}`,
  });

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

  const editingVersion = useMemo(() => editingQuote?.versions?.[0] || null, [editingQuote]);

  const editingBoqRows = useMemo(() => {
    if (!editingVersion) {
      return undefined;
    }

    return editingVersion.items
      .map((entry) => {
        const item = {
          id: entry.item.id,
          name: entry.item.name,
          description: entry.item.description || null,
          brand: entry.item.brand || null,
          unitPrice: Number(entry.item.unitPrice || 0),
          taxPercent: Number(entry.item.taxPercent || 0),
          marginPercent: Number(entry.item.marginPercent || 0),
          uom: entry.item.uom || null,
          category: entry.item.category || null,
          pricingUnit: entry.item.pricingUnit || null,
        };
        const itemHead = resolveBoqItemHead(item);
        const sequence = itemHead
          ? [
              "SOLAR MODULE",
              "SOLAR INVERTER",
              "SOLAR STRUCTURE",
              "SOLAR STRUCTURE Accessories",
              "ELECTRICAL PROTECTION Panels",
              "AC CABLE",
              "DC CABLE",
              "ELECTRICAL PROTECTION ITEMS",
              "LIGHTNING ARRESTOR ACCESSORIES",
              "EARTHING SOLUTION",
              "EARTHING CONNECTIVITY",
              "EARTHING ACCESSORIES",
              "MODULE TO MODULE EARTHING CU.CABLE",
              "ELECTRICAL INSTALLATIONS",
              "WALKWAY",
              "WALKWAY FITTINGS",
              "PV INSTALLATIONS",
              "CIVIL WORK",
              "MISCELLANEOUS",
              "CHARGES",
            ].indexOf(itemHead) + 1
          : 0;

        if (!itemHead || sequence <= 0) {
          return null;
        }

        return {
          sequence,
          itemHead,
          itemId: entry.item.id,
          itemType: getBoqDisplayParts(item).itemType || entry.item.name,
          quantity: Number(entry.quantity || 0),
          quantityTouched: false,
        };
      })
      .filter(Boolean);
  }, [editingVersion]);

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
                <SortableTableHeader label="Quote ID" sortKey="title" activeSortKey={sortConfig?.key} direction={sortConfig?.direction} onSort={(key) => requestSort(key as QuotationSortKey)} className="px-4 py-3" />
                <SortableTableHeader label="Client" sortKey="client" activeSortKey={sortConfig?.key} direction={sortConfig?.direction} onSort={(key) => requestSort(key as QuotationSortKey)} className="px-4 py-3" />
                <SortableTableHeader label="Versions" sortKey="versions" activeSortKey={sortConfig?.key} direction={sortConfig?.direction} onSort={(key) => requestSort(key as QuotationSortKey)} className="px-4 py-3" />
                <SortableTableHeader label="Total" sortKey="total" activeSortKey={sortConfig?.key} direction={sortConfig?.direction} onSort={(key) => requestSort(key as QuotationSortKey)} className="px-4 py-3" />
                <SortableTableHeader label="Status" sortKey="status" activeSortKey={sortConfig?.key} direction={sortConfig?.direction} onSort={(key) => requestSort(key as QuotationSortKey)} className="px-4 py-3" />
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
                paginatedQuotes.map((quote) => {
                  const latestVersion = quote.versions[0];
                  const isExpanded = selectedQuoteId === quote.id;
                  return (
                    <Fragment key={quote.id}>
                      <tr className="border-t border-solar-border hover:bg-solar-sand/50 cursor-pointer" onClick={() => setSelectedQuoteId(isExpanded ? null : quote.id)}>
                        <td className="px-4 py-3 font-medium text-solar-ink">
                          <div className="flex items-center gap-2">
                            <span className="text-solar-muted">{isExpanded ? "▼" : "▶"}</span>
                            {quote.title}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-solar-muted">{quote.client.name}</td>
                        <td className="px-4 py-3 text-solar-muted">
                          <div>{quote.versions.length} version(s)</div>
                          <div className="text-[11px] text-solar-muted/80">{quote.inquiry?.title || "No inquiry linked"}</div>
                        </td>
                        <td className="px-4 py-3 font-medium text-solar-ink">
                          {formatCurrency(Number(latestVersion?.grandTotal || 0))}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              quote.status === "WON" ? "bg-green-100 text-green-800" :
                              quote.status === "LOST" ? "bg-red-100 text-red-800" :
                              "bg-solar-sky text-solar-forest"
                            }`}>
                              {quote.status}
                            </span>
                            {quote.finalVersionId && (
                              <span className="text-[11px] text-solar-muted">Final version selected</span>
                            )}
                          </div>
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
                              {!version.isFinal && (
                                <button
                                  onClick={() => handleMarkFinal(quote.id, version.id)}
                                  className="text-xs text-solar-ink hover:underline"
                                >
                                  Mark Final
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          startItem={startItem}
          endItem={endItem}
          onPageChange={setCurrentPage}
          itemLabel="quotations"
        />
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
          subtitle={`Version ${compareVersion.version} summary`}
          onClose={() => setCompareVersion(null)}
          size="2xl"
        >
          <div className="space-y-4 text-sm text-solar-ink">
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
                        <td className="px-3 py-2 text-solar-ink">{item.description || item.item.name}</td>
                        <td className="px-3 py-2 text-right text-solar-muted">{Number(item.quantity)}</td>
                        <td className="px-3 py-2 text-right text-solar-muted">{formatCurrency(Number(item.rate || 0))}</td>
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

      {newVersionForQuote && (
        <SolarQuotationForm
          quotationId={newVersionForQuote.id}
          defaultClientId={newVersionForQuote.clientId}
          defaultInquiryId={newVersionForQuote.inquiryId || ""}
          defaultTitle={newVersionForQuote.title}
          defaultVersion={getNextVersion(newVersionForQuote)}
          clientName={newVersionForQuote.client.name}
          inquiryTitle={newVersionForQuote.inquiry?.title || ""}
          onClose={() => setNewVersionForQuote(null)}
          onSuccess={() => {
            fetchQuotes();
            setNewVersionForQuote(null);
          }}
        />
      )}

      {editingQuote && editingVersion && (
        <SolarQuotationForm
          quotationId={editingQuote.id}
          editVersionId={editingVersion.id}
          defaultClientId={editingQuote.clientId}
          defaultInquiryId={editingQuote.inquiryId || ""}
          defaultTitle={editingQuote.title}
          defaultVersion={editingVersion.version}
          defaultBrand={editingVersion.brand || ""}
          initialDocumentData={normalizeQuotationDocumentData(editingVersion.documentData)}
          initialBoqRows={editingBoqRows}
          clientName={editingQuote.client.name}
          inquiryTitle={editingQuote.inquiry?.title || ""}
          onClose={() => setEditingQuote(null)}
          onSuccess={() => {
            fetchQuotes();
            setEditingQuote(null);
          }}
        />
      )}
    </div>
  );
}