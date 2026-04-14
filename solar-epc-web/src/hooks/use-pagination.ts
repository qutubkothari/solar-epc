"use client";

import { useEffect, useMemo, useState } from "react";

type UsePaginationOptions = {
  pageSize?: number;
  resetKey?: string | number;
};

export function usePagination<T>(items: T[], options: UsePaginationOptions = {}) {
  const pageSize = options.pageSize ?? 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [options.resetKey]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = totalItems === 0 ? 0 : Math.min(currentPage * pageSize, totalItems);

  return {
    currentPage,
    setCurrentPage,
    totalItems,
    totalPages,
    pageSize,
    startItem,
    endItem,
    paginatedItems,
  };
}