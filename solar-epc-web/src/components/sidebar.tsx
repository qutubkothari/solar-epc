"use client";

import Link from "next/link";
import clsx from "clsx";
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  FileSpreadsheet,
  BadgeCheck,
  Users,
  QrCode,
  Settings,
  ListChecks,
  Package,
  BookOpen,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Palette,
} from "lucide-react";

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

const navItems = [
  { href: "/", label: "Performance Hub", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/inquiries", label: "Inquiries", icon: ClipboardList },
  { href: "/items", label: "Item Master", icon: Package },
  { href: "/technical-proposal", label: "Technical Proposal", icon: ScrollText },
  { href: "/quotations", label: "Quotations", icon: FileSpreadsheet },
  { href: "/applications", label: "Applications", icon: FileText },
  { href: "/execution", label: "Execution", icon: BadgeCheck },
  { href: "/documents", label: "Closure Pack", icon: BookOpen },
  { href: "/tasks", label: "Tasks & Reminders", icon: ListChecks },
  { href: "/tokens", label: "Client Tokens", icon: QrCode },
  { href: "/company-branding", label: "Company Branding", icon: Palette },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={clsx(
        "fixed inset-y-0 left-0 z-40 border-r border-solar-border bg-white shadow-solar",
        "transition-all",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-2 px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-solar-amber text-white font-semibold">
              SE
            </div>
            {!collapsed && (
              <div>
                <p className="text-sm font-semibold text-solar-ink">
                  SOLAR EPC SUITE
                </p>
                <p className="text-xs text-solar-muted">Enterprise Console</p>
              </div>
            )}
          </div>
          <button
            onClick={onToggle}
            className="rounded-full border border-solar-border p-1 text-solar-muted hover:bg-solar-sand"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 px-2">
          <p
            className={clsx(
              "px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-solar-muted",
              collapsed && "text-center"
            )}
          >
            Overview
          </p>
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-solar-ink hover:bg-solar-sand",
                    collapsed && "justify-center"
                  )}
                >
                  <Icon className="h-5 w-5 text-solar-amber" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-solar-border px-4 py-4">
          <div className={clsx("flex items-center gap-3", collapsed && "justify-center")}>
            <div className="h-9 w-9 rounded-full bg-solar-forest text-white flex items-center justify-center text-xs font-semibold">
              HQ
            </div>
            {!collapsed && (
              <div>
                <p className="text-sm font-semibold text-solar-ink">Hi-Tech Solar</p>
                <p className="text-xs text-solar-muted">admin@hitechsolar.com</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button className="mt-3 w-full rounded-xl border border-solar-border py-2 text-sm font-semibold text-solar-ink hover:bg-solar-sand">
              Sign out
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
