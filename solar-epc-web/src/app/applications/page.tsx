import { SectionHeader } from "@/components/section-header";

export default function ApplicationsPage() {
  const docs = [
    { name: "DG NOC", status: "Generated", owner: "Mustafa Q." },
    { name: "Agreement", status: "Pending", owner: "Aisha M." },
    { name: "Undertaking", status: "Generated", owner: "Ravi K." },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Applications & Statutory Docs"
        subtitle="Auto-fill client templates and generate compliant PDFs."
        action={
          <button className="rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white">
            Generate Pack
          </button>
        }
      />

      <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {docs.map((doc) => (
            <div
              key={doc.name}
              className="rounded-xl border border-solar-border bg-solar-sand p-4"
            >
              <p className="text-sm font-semibold text-solar-ink">{doc.name}</p>
              <p className="text-xs text-solar-muted mt-2">Owner: {doc.owner}</p>
              <span className="mt-3 inline-flex rounded-full bg-solar-sky px-3 py-1 text-xs font-semibold text-solar-forest">
                {doc.status}
              </span>
              <button className="mt-4 w-full rounded-xl border border-solar-border bg-white py-2 text-xs font-semibold text-solar-ink">
                View PDF
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
