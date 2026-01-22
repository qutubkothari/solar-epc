"use client";

import { Bell, Plus, Search } from "lucide-react";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 mt-4 flex items-center justify-between rounded-2xl border border-solar-border bg-white/90 px-5 py-4 shadow-solar backdrop-blur">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-solar-muted">
          UAE Performance Suite
        </p>
        <h1 className="text-xl font-semibold text-solar-ink">Performance Workspace</h1>
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
        <button className="flex items-center gap-2 rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white shadow-solar hover:bg-solar-amber-dark">
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>
    </header>
  );
}
