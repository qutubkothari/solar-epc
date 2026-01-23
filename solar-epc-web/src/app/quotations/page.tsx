"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/section-header";
import { QuotationForm } from "@/components/quotation-form";
import { ModalShell } from "@/components/modal-shell";
import { formatCurrency } from "@/lib/format";

type QuotationVersion = {
  id: string;
  version: string;
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
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [compareVersion, setCompareVersion] = useState<QuotationVersion | null>(null);
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
                <select
                  value={selectedQuoteId || ""}
                  onChange={(event) => setSelectedQuoteId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm"
                >
                  {quotes.map((quote) => (
                    <option key={quote.id} value={quote.id}>
                      {quote.title} • {quote.client.name}
                    </option>
                  ))}
                </select>
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
          </div>

          <div className="rounded-xl border border-solar-border bg-white p-4">
            <p className="text-sm font-semibold text-solar-ink">Versioning</p>
            <p className="text-xs text-solar-muted mt-1">
              Preserve every iteration with final approval flag.
            </p>
            <div className="mt-4 space-y-2 text-xs">
              {quotes.length === 0 ? (
                <div className="text-solar-muted">No versions yet.</div>
              ) : (
                quotes
                  .flatMap((quote) => quote.versions)
                  .slice(0, 3)
                  .map((version) => (
                    <div
                      key={version.id}
                      className="flex items-center justify-between rounded-lg border border-solar-border px-3 py-2"
                    >
                      <span className="font-semibold text-solar-ink">
                        {version.version} {version.isFinal ? "(Final)" : ""}
                      </span>
                      <button
                        onClick={() => setCompareVersion(version)}
                        className="text-solar-forest"
                      >
                        Compare
                      </button>
                    </div>
                  ))
              )}
            </div>
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
        <QuotationForm
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
          size="md"
        >
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
