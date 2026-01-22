"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/section-header";
import { QuotationForm } from "@/components/quotation-form";
import { formatCurrency } from "@/lib/format";

type QuotationVersion = {
  id: string;
  version: string;
  grandTotal: number;
  isFinal: boolean;
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
            <div className="mt-4 space-y-2 text-xs text-solar-muted">
              <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                <span>550W Mono Panel x 2100</span>
                <span>AED 1,420,000</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                <span>10kW Inverter x 120</span>
                <span>AED 456,000</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                <span>Balance of System</span>
                <span>AED 304,000</span>
              </div>
            </div>
            <button
              onClick={() => alert("PDF generation will be enabled when templates are uploaded.")}
              className="mt-4 w-full rounded-xl bg-solar-forest py-2 text-sm font-semibold text-white"
            >
              Generate PDF
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
                        onClick={() => alert("Version comparison coming next.")}
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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-solar-muted">
                    Loading...
                  </td>
                </tr>
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-solar-muted">
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
    </div>
  );
}
