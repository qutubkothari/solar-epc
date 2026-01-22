import { SectionHeader } from "@/components/section-header";

export default function DocumentsPage() {
  const packs = [
    {
      name: "Al Qudra Villas",
      status: "Ready",
      updated: "22 Jan 2026",
    },
    {
      name: "Al Barsha Retail",
      status: "In Progress",
      updated: "21 Jan 2026",
    },
    {
      name: "Jebel Ali Logistics",
      status: "Ready",
      updated: "20 Jan 2026",
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Completion & Closure Pack"
        subtitle="Generate and bundle statutory PDFs for client handover."
        action={
          <button className="rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white">
            Generate Pack
          </button>
        }
      />

      <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
        <div className="space-y-4">
          {packs.map((pack) => (
            <div
              key={pack.name}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-solar-border bg-solar-sand px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-solar-ink">{pack.name}</p>
                <p className="text-xs text-solar-muted">Updated {pack.updated}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-solar-sky px-3 py-1 text-xs font-semibold text-solar-forest">
                  {pack.status}
                </span>
                <button className="rounded-xl border border-solar-border bg-white px-3 py-2 text-xs font-semibold text-solar-ink">
                  Share Token
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
