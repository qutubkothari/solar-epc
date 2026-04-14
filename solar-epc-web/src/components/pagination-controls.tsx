type PaginationControlsProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  startItem: number;
  endItem: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
};

function buildVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 5];
  }

  if (currentPage >= totalPages - 2) {
    return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
}

export function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  startItem,
  endItem,
  onPageChange,
  itemLabel = "items",
}: PaginationControlsProps) {
  if (totalItems === 0 || totalPages <= 1) {
    return null;
  }

  const visiblePages = buildVisiblePages(currentPage, totalPages);

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-solar-border pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-solar-muted">
        Showing {startItem}-{endItem} of {totalItems} {itemLabel} ({pageSize} per page)
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="rounded-lg border border-solar-border bg-white px-3 py-1.5 text-xs font-semibold text-solar-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        {visiblePages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={
              page === currentPage
                ? "rounded-lg bg-solar-amber px-3 py-1.5 text-xs font-semibold text-white"
                : "rounded-lg border border-solar-border bg-white px-3 py-1.5 text-xs font-semibold text-solar-ink"
            }
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="rounded-lg border border-solar-border bg-white px-3 py-1.5 text-xs font-semibold text-solar-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}