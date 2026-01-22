import { SectionHeader } from "@/components/section-header";

export default function QuotationsPage() {
  const quotes = [
    {
      id: "Q-2211",
      client: "Meraas Holdings",
      version: "1.2",
      total: "AED 2,180,000",
      status: "Final",
    },
    {
      id: "Q-2208",
      client: "Sunline Retail",
      version: "1.0",
      total: "AED 730,000",
      status: "Draft",
    },
    {
      id: "Q-2204",
      client: "Portside Logistics",
      version: "1.1",
      total: "AED 1,140,000",
      status: "Approved",
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Quotation Engine"
        subtitle="Create, version, and compare quotations with real-time pricing."
        action={
          <button className="rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white">
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
            <button className="mt-4 w-full rounded-xl bg-solar-forest py-2 text-sm font-semibold text-white">
              Generate PDF
            </button>
          </div>

          <div className="rounded-xl border border-solar-border bg-white p-4">
            <p className="text-sm font-semibold text-solar-ink">Versioning</p>
            <p className="text-xs text-solar-muted mt-1">
              Preserve every iteration with final approval flag.
            </p>
            <div className="mt-4 space-y-2 text-xs">
              {["1.2 (Final)", "1.1", "1.0"].map((version) => (
                <div
                  key={version}
                  className="flex items-center justify-between rounded-lg border border-solar-border px-3 py-2"
                >
                  <span className="font-semibold text-solar-ink">{version}</span>
                  <button className="text-solar-forest">Compare</button>
                </div>
              ))}
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
              {quotes.map((quote) => (
                <tr key={quote.id} className="border-t border-solar-border">
                  <td className="px-4 py-3 font-medium text-solar-ink">
                    {quote.id}
                  </td>
                  <td className="px-4 py-3 text-solar-muted">{quote.client}</td>
                  <td className="px-4 py-3 text-solar-muted">{quote.version}</td>
                  <td className="px-4 py-3 text-solar-muted">{quote.total}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-solar-sky px-3 py-1 text-xs font-semibold text-solar-forest">
                      {quote.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
