"use client";

import { useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

export type SortConfig<SortKey extends string> = {
  key: SortKey;
  direction: SortDirection;
};

type UseSortableDataOptions<T, SortKey extends string> = {
  accessors: Record<SortKey, (item: T) => unknown>;
  initialSort?: SortConfig<SortKey> | null;
};

function normalizeSortValue(value: unknown) {
  if (value == null) {
    return "";
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return Number.isNaN(value) ? 0 : value;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  const stringValue = String(value).trim();
  const numericCandidate = Number(stringValue.replace(/,/g, ""));
  if (stringValue && !Number.isNaN(numericCandidate) && /^[-+]?\d+(?:\.\d+)?$/.test(stringValue.replace(/,/g, ""))) {
    return numericCandidate;
  }

  const parsedDate = Date.parse(stringValue);
  if (!Number.isNaN(parsedDate) && /[-/T:]/.test(stringValue)) {
    return parsedDate;
  }

  return stringValue.toLowerCase();
}

export function useSortableData<T, SortKey extends string>(
  items: T[],
  options: UseSortableDataOptions<T, SortKey>
) {
  const [sortConfig, setSortConfig] = useState<SortConfig<SortKey> | null>(options.initialSort ?? null);

  const sortedItems = useMemo(() => {
    if (!sortConfig) {
      return items;
    }

    const accessor = options.accessors[sortConfig.key];

    return [...items].sort((leftItem, rightItem) => {
      const left = normalizeSortValue(accessor(leftItem));
      const right = normalizeSortValue(accessor(rightItem));

      if (left === right) {
        return 0;
      }

      const comparison = left < right ? -1 : 1;
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [items, options.accessors, sortConfig]);

  const requestSort = (key: SortKey) => {
    setSortConfig((current) => {
      if (!current || current.key !== key) {
        return { key, direction: "asc" };
      }

      return {
        key,
        direction: current.direction === "asc" ? "desc" : "asc",
      };
    });
  };

  return {
    sortedItems,
    sortConfig,
    requestSort,
  };
}