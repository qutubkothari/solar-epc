import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { SortDirection } from "@/hooks/use-sortable-data";

type SortableTableHeaderProps = {
  label: string;
  sortKey: string;
  activeSortKey?: string | null;
  direction?: SortDirection;
  onSort: (key: string) => void;
  className?: string;
  align?: "left" | "center" | "right";
};

export function SortableTableHeader({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort,
  className = "",
  align = "left",
}: SortableTableHeaderProps) {
  const isActive = activeSortKey === sortKey;
  const Icon = !isActive ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;
  const alignmentClass = align === "right" ? "justify-end text-right" : align === "center" ? "justify-center text-center" : "justify-start text-left";

  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`group inline-flex w-full items-center gap-1.5 ${alignmentClass}`}
      >
        <span>{label}</span>
        <Icon
          className={
            isActive
              ? "h-3.5 w-3.5 text-solar-amber"
              : "h-3.5 w-3.5 text-solar-muted transition-colors group-hover:text-solar-ink"
          }
        />
      </button>
    </th>
  );
}