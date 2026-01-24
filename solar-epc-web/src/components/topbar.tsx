"use client";

import { Bell, Search } from "lucide-react";
import { useEffect, useState } from "react";

type CompanySettings = {
  companyName: string;
  companyTagline?: string | null;
  companyLogo?: string | null;
};

export function TopBar() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  useEffect(() => {
    fetch("/api/company-settings")
      .then((res) => res.json())
      .then((data) => setSettings(data))
      .catch(console.error);
  }, []);

  return (
    <header className="sticky top-0 z-30 mt-4 flex items-center justify-between rounded-2xl border border-solar-border bg-white/90 px-5 py-4 shadow-solar backdrop-blur">
      <div className="flex items-center gap-3">
        {settings?.companyLogo && (
          <img
            src={settings.companyLogo}
            alt={settings.companyName}
            className="h-10 w-auto object-contain"
          />
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-solar-muted">
            {settings?.companyTagline || "UAE Performance Suite"}
          </p>
          <h1 className="text-xl font-semibold text-solar-ink">
            {settings?.companyName || "Performance Workspace"}
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className="hidden items-center gap-2 rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm text-solar-muted md:flex">
          <Search className="h-4 w-4" />
          <input
            placeholder="Search projects, clients, tasks"
            className="bg-transparent outline-none placeholder:text-solar-muted"
          />
        </label>
        <button className="rounded-xl border border-solar-border bg-white px-3 py-2 text-solar-ink hover:bg-solar-sand">
          <Bell className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
