"use client";

import { ReactNode, useState } from "react";

type ModalShellProps = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  children: ReactNode;
};

const sizeClasses: Record<NonNullable<ModalShellProps["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
  "2xl": "max-w-5xl",
  full: "max-w-none",
};

export function ModalShell({ title, subtitle, onClose, size = "xl", children }: ModalShellProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const baseSizeClass = sizeClasses[size];
  const widthClass = isMaximized ? "w-[95vw] h-[90vh]" : `w-full ${baseSizeClass}`;
  const bodyClass = isMaximized ? "max-h-[75vh]" : "max-h-[70vh]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div
        className={`rounded-2xl border border-solar-border bg-white p-6 shadow-solar ${widthClass} ${
          isMinimized ? "h-14 overflow-hidden" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-solar-ink">{title}</h2>
            {!isMinimized && subtitle && (
              <p className="mt-1 text-sm text-solar-muted">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMinimized((prev) => !prev)}
              className="rounded-lg border border-solar-border bg-white px-2 py-1 text-xs font-semibold text-solar-ink"
              aria-label={isMinimized ? "Restore" : "Minimize"}
              title={isMinimized ? "Restore" : "Minimize"}
            >
              {isMinimized ? "▢" : "—"}
            </button>
            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              className="rounded-lg border border-solar-border bg-white px-2 py-1 text-xs font-semibold text-solar-ink"
              aria-label={isMaximized ? "Restore" : "Maximize"}
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? "🗗" : "🗖"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-solar-border bg-white px-2 py-1 text-xs font-semibold text-solar-ink"
              aria-label="Close"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {!isMinimized && (
          <div className={`mt-6 overflow-y-auto ${bodyClass}`}>{children}</div>
        )}
      </div>
    </div>
  );
}
