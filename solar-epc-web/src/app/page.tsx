"use client";

import Link from "next/link";
import { SectionHeader } from "@/components/section-header";
import { useEffect, useState } from "react";

type CompanySettings = {
  companyName: string;
  companyTagline?: string | null;
  companyLogo?: string | null;
};

export default function Home() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  useEffect(() => {
    fetch("/api/company-settings")
      .then((res) => res.json())
      .then((data) => setSettings(data))
      .catch(console.error);
  }, []);

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
        {settings?.companyLogo && (
          <img
            src={settings.companyLogo}
            alt={settings.companyName}
            className="h-24 mx-auto object-contain mb-4"
          />
        )}
        <h3 className="text-lg font-semibold text-solar-ink">
          {settings?.companyName || "Solar EPC"}
        </h3>
        <p className="text-sm text-solar-muted mt-2">
          {settings?.companyTagline || "Your complete solar project management system"}
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
