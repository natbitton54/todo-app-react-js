import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
  currentPage,
  hasPrevPage,
  hasNextPage,
  onPrev,
  onNext,
  onPageClick,
  pageSize,
  setPageSize,
  totalItems,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const maxVisibleButtons = 5;

  const startPage = Math.max(
    1,
    Math.min(currentPage - Math.floor(maxVisibleButtons / 2), totalPages - maxVisibleButtons + 1)
  )

  const endPage = Math.min(startPage + maxVisibleButtons - 1, totalPages)

  const handlePageSizeChange = (e) => {
    const newSize = Number(e.target.value);
    setPageSize(newSize);
    onPageClick(1); // Reset to page 1
  };

  return (
    <div className="flex flex-col items-center gap-2 mt-6 text-gray-900 dark:text-gray-100">
      {/* Row: Pagination buttons and Show selector side by side */}
      <div className="flex items-center justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={!hasPrevPage}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
            aria-label="Previous Page"
          >
            <ChevronLeft />
          </button>

          {Array.from({ length: endPage - startPage + 1 }, (_, i) => {
            const page = startPage + i;
            const isActive = page === currentPage;
            return (
              <button
                key={page}
                onClick={() => !isActive && onPageClick(page)}
                className={`px-3 py-1 border rounded transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {page}
              </button>
            );
          })}

          <button
            onClick={onNext}
            disabled={!hasNextPage}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
            aria-label="Next Page"
          >
            <ChevronRight />
          </button>
        </div>

        {/* Show selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="pageSize" className="text-sm">
            Show:
          </label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={handlePageSizeChange}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1 text-sm"
          >
            {[5, 10, 15, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Page info centered below */}
      <span className="text-sm mt-4 text-center mb-4">
        Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
      </span>
    </div>
  );
}
