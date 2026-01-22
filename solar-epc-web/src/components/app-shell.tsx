"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("solar.epc.sidebar");
    if (stored) {
      setCollapsed(stored === "collapsed");
    }
  }, []);

  const handleToggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(
        "solar.epc.sidebar",
        next ? "collapsed" : "expanded"
      );
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-solar-sand text-solar-ink">
      <Sidebar collapsed={collapsed} onToggle={handleToggle} />
      <div
        className={clsx(
          "transition-all",
          collapsed ? "pl-20" : "pl-72",
          "pr-6"
        )}
      >
        <TopBar />
        <main className="pb-10 pt-4">{children}</main>
      </div>
    </div>
  );
}
