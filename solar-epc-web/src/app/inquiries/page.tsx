import { SectionHeader } from "@/components/section-header";

export default function InquiriesPage() {
  const inquiries = [
    {
      id: "INQ-1024",
      client: "Meraas Holdings",
      site: "Al Qudra Villas",
      status: "New",
      owner: "Aisha M.",
    },
    {
      id: "INQ-1021",
      client: "Sunline Retail",
      site: "Al Barsha Retail",
      status: "Quoted",
      owner: "Mustafa Q.",
    },
    {
      id: "INQ-1019",
      client: "Portside Logistics",
      site: "Jebel Ali Logistics",
      status: "Approved",
      owner: "Ravi K.",
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Inquiry Management"
        subtitle="Capture new client requests and manage site media uploads."
        action={
          <button className="rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white">
            New Inquiry
          </button>
        }
      />

      <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            className="w-full max-w-xs rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
            placeholder="Search inquiries"
          />
          <div className="flex gap-2">
            <button className="rounded-xl border border-solar-border px-3 py-2 text-sm text-solar-ink">
              Export PDF
            </button>
            <button className="rounded-xl border border-solar-border px-3 py-2 text-sm text-solar-ink">
              Upload Media
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-solar-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-solar-sand text-xs uppercase tracking-wider text-solar-muted">
              <tr>
                <th className="px-4 py-3">Inquiry ID</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inquiry) => (
                <tr key={inquiry.id} className="border-t border-solar-border">
                  <td className="px-4 py-3 font-medium text-solar-ink">
                    {inquiry.id}
                  </td>
                  <td className="px-4 py-3 text-solar-muted">{inquiry.client}</td>
                  <td className="px-4 py-3 text-solar-muted">{inquiry.site}</td>
                  <td className="px-4 py-3 text-solar-muted">{inquiry.owner}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-solar-sky px-3 py-1 text-xs font-semibold text-solar-forest">
                      {inquiry.status}
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
