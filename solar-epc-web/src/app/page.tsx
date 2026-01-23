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
