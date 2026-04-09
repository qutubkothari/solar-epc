"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/section-header";
import { SolarQuotationForm } from "@/components/solar-quotation-form";
import { ModalShell } from "@/components/modal-shell";
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
    rate?: number;
    description?: string | null;
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

type Inquiry = {
  id: string;
  title: string;
};

export default function QuotationsPage() {
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newVersionForQuote, setNewVersionForQuote] = useState<Quotation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [compareVersion, setCompareVersion] = useState<QuotationVersion | null>(null);
  const [editingQuote, setEditingQuote] = useState<Quotation | null>(null);
  const [editData, setEditData] = useState({ title: "", status: "DRAFT", inquiryId: "" });

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
    fetch("/api/inquiries")
      .then((res) => res.json())
      .then((data) => setInquiries(data || []))
      .catch(() => setInquiries([]));
  }, []);

  useEffect(() => {
    if (editingQuote) {
      setEditData({
        title: editingQuote.title || "",
        status: editingQuote.status || "DRAFT",
        inquiryId: editingQuote.inquiryId || "",
      });
    }
  }, [editingQuote]);

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
          subtitle={`Version ${compareVersion.version} summary`}
          onClose={() => setCompareVersion(null)}
          size="2xl"
        >
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
            <div>
              <label className="block text-sm font-semibold text-solar-ink">Inquiry / Project</label>
              <select
                value={editData.inquiryId}
                onChange={(event) => setEditData({ ...editData, inquiryId: event.target.value })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              >
                <option value="">Select inquiry</option>
                {inquiries.map((inquiry) => (
                  <option key={inquiry.id} value={inquiry.id}>
                    {inquiry.title}
                  </option>
                ))}
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
