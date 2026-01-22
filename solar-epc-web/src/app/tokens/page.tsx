import { SectionHeader } from "@/components/section-header";

export default function TokensPage() {
  const tokens = [
    {
      client: "Meraas Holdings",
      project: "Al Qudra Villas",
      token: "SXR-92A1",
      expiry: "30 Jan 2026",
    },
    {
      client: "Sunline Retail",
      project: "Al Barsha Retail",
      token: "KMP-77B2",
      expiry: "05 Feb 2026",
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Client Document Tokens"
        subtitle="Share secure, view-only links for closure document packs."
        action={
          <button className="rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white">
            Generate Token
          </button>
        }
      />

      <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
        <div className="space-y-4">
          {tokens.map((token) => (
            <div
              key={token.token}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-solar-border bg-solar-sand px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-solar-ink">
                  {token.project}
                </p>
                <p className="text-xs text-solar-muted">{token.client}</p>
              </div>
              <div className="text-xs text-solar-muted">
                Token: <span className="font-semibold text-solar-ink">{token.token}</span>
                <div>Expiry: {token.expiry}</div>
              </div>
              <div className="flex gap-2">
                <button className="rounded-xl border border-solar-border bg-white px-3 py-2 text-xs font-semibold text-solar-ink">
                  Copy Link
                </button>
                <button className="rounded-xl border border-solar-border bg-white px-3 py-2 text-xs font-semibold text-solar-ink">
                  Open
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
