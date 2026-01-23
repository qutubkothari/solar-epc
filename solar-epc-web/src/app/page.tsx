import Link from "next/link";
import { SectionHeader } from "@/components/section-header";

export default function Home() {
  return (
    <div className="space-y-8">
      <SectionHeader
        title="Performance Workspace"
        subtitle="Monitor the full project lifecycle from inquiry to closure."
        action={
          <Link
            href="/inquiries"
            className="rounded-xl bg-solar-forest px-4 py-2 text-sm font-semibold text-white"
          >
            Create Inquiry
          </Link>
        }
      />

      <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar text-center">
        <h3 className="text-lg font-semibold text-solar-ink">Welcome to Solar EPC</h3>
        <p className="text-sm text-solar-muted mt-2">
          Your complete solar project management system
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Link
            href="/inquiries"
            className="rounded-xl border border-solar-border bg-solar-sand p-6 hover:bg-solar-sky transition-colors"
          >
            <p className="text-sm font-semibold text-solar-ink">Start New Inquiry</p>
            <p className="text-xs text-solar-muted mt-1">Capture client requests</p>
          </Link>
          <Link
            href="/quotations"
            className="rounded-xl border border-solar-border bg-solar-sand p-6 hover:bg-solar-sky transition-colors"
          >
            <p className="text-sm font-semibold text-solar-ink">Create Quotation</p>
            <p className="text-xs text-solar-muted mt-1">Generate solar quotes</p>
          </Link>
          <Link
            href="/technical-proposal"
            className="rounded-xl border border-solar-border bg-solar-sand p-6 hover:bg-solar-sky transition-colors"
          >
            <p className="text-sm font-semibold text-solar-ink">Technical Proposal</p>
            <p className="text-xs text-solar-muted mt-1">Detailed project proposals</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Performance Workspace"
        subtitle="Monitor the full project lifecycle from inquiry to closure."
        action={
          <Link
            href="/inquiries"
            className="rounded-xl bg-solar-forest px-4 py-2 text-sm font-semibold text-white"
          >
            Create Inquiry
          </Link>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Open Inquiries"
          value="24"
          trend="+6 this week"
          icon={<PackageCheck className="h-5 w-5 text-solar-amber" />}
        />
        <StatCard
          title="Quotations"
          value="18"
          trend="Avg turnaround 2.3 days"
          icon={<FileCheck className="h-5 w-5 text-solar-amber" />}
        />
        <StatCard
          title="Execution Phase"
          value="9"
          trend="3 pending serial captures"
          icon={<CalendarCheck className="h-5 w-5 text-solar-amber" />}
        />
        <StatCard
          title="Closure Packs"
          value="11"
          trend="100% compliance last month"
          icon={<ArrowUpRight className="h-5 w-5 text-solar-amber" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
          <h3 className="text-lg font-semibold text-solar-ink">Active Projects</h3>
          <p className="text-sm text-solar-muted mt-1">
            Track progress across quotation, compliance, execution, and closure.
          </p>
          <div className="mt-6 space-y-4">
            {[
              {
                name: "Al Qudra Villas",
                client: "Meraas Holdings",
                stage: "Execution - Serial Capture",
                due: "24 Jan 2026",
              },
              {
                name: "Al Barsha Retail",
                client: "Sunline Retail",
                stage: "Statutory Docs Pending",
                due: "27 Jan 2026",
              },
              {
                name: "Jebel Ali Logistics",
                client: "Portside Logistics",
                stage: "Quotation Finalization",
                due: "22 Jan 2026",
              },
            ].map((project) => (
              <div
                key={project.name}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-solar-border bg-solar-sand px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-solar-ink">
                    {project.name}
                  </p>
                  <p className="text-xs text-solar-muted">{project.client}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-solar-forest">
                    {project.stage}
                  </p>
                  <p className="text-xs text-solar-muted">Due {project.due}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
          <h3 className="text-lg font-semibold text-solar-ink">Today’s Focus</h3>
          <p className="text-sm text-solar-muted mt-1">
            Priority reminders to keep teams aligned.
          </p>
          <div className="mt-6 space-y-4">
            {[
              {
                label: "Send quotation v1.2 to Sunline Retail",
                owner: "Aisha M.",
              },
              {
                label: "Capture inverter serials for Al Qudra",
                owner: "Ravi K.",
              },
              {
                label: "Generate closure pack for Jebel Ali",
                owner: "Mustafa Q.",
              },
            ].map((task) => (
              <div
                key={task.label}
                className="rounded-xl border border-solar-border bg-solar-sand px-4 py-3"
              >
                <p className="text-sm font-semibold text-solar-ink">
                  {task.label}
                </p>
                <p className="text-xs text-solar-muted">Owner: {task.owner}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
