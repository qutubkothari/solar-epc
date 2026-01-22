import { ReactNode } from "react";

type StatCardProps = {
  title: string;
  value: string;
  trend?: string;
  icon?: ReactNode;
};

export function StatCard({ title, value, trend, icon }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-solar-border bg-white p-5 shadow-solar">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-solar-muted">
          {title}
        </p>
        {icon}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-semibold text-solar-ink">{value}</p>
        {trend && <p className="text-xs text-solar-muted mt-2">{trend}</p>}
      </div>
    </div>
  );
}
