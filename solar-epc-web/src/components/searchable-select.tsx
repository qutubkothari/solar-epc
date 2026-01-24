"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

export type SearchableOption = {
  value: string;
  label: string;
  subtitle?: string;
};

type SearchableSelectProps = {
  value: string;
  options: SearchableOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
};

export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyLabel = "No results",
  disabled = false,
  className,
}: SearchableSelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return options;
    return options.filter((option) => {
      return (
        option.label.toLowerCase().includes(search) ||
        option.subtitle?.toLowerCase().includes(search)
      );
    });
  }, [options, query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
  }, [open]);

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={clsx(
          "flex w-full items-center justify-between rounded-xl border border-solar-border bg-white px-3 py-2 text-sm text-left shadow-sm hover:border-solar-amber transition-colors",
          disabled && "opacity-60 cursor-not-allowed bg-gray-100"
        )}
      >
        <span className={clsx(!selected && "text-gray-500")}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="text-solar-muted">▾</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-solar-border bg-white shadow-solar">
          <div className="border-b border-solar-border p-2">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-solar-muted">{emptyLabel}</div>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={clsx(
                    "w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-solar-sand",
                    option.value === value && "bg-solar-sky"
                  )}
                >
                  <div className="font-medium text-solar-ink">{option.label}</div>
                  {option.subtitle && (
                    <div className="text-xs text-solar-muted">{option.subtitle}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
