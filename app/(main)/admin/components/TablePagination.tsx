"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

export const PAGE_SIZE_OPTIONS = [10, 25, 50]

/** Client-side paging; the page is clamped so shrinking results never leave you on an empty page */
export function usePagination<T>(items: T[], initialPageSize = 10) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const current = Math.min(page, pageCount)
  const start = (current - 1) * pageSize

  return {
    page: current,
    pageSize,
    pageCount,
    total: items.length,
    rows: items.slice(start, start + pageSize),
    from: items.length ? start + 1 : 0,
    to: Math.min(start + pageSize, items.length),
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size)
      setPage(1)
    },
    reset: () => setPage(1),
  }
}

type Pagination = ReturnType<typeof usePagination<unknown>>

/** Footer: "1–10 of 42", rows-per-page and prev/next with page numbers */
export function TablePagination({ pagination, noun }: { pagination: Pagination; noun: string }) {
  const { page, pageCount, pageSize, total, from, to, setPage, setPageSize } = pagination
  if (total === 0) return null

  // Compact page list: first, last, current ±1, with gaps
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1
  )

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 px-4 py-2.5 text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="tabular-nums">
          {from}–{to} of {total} {noun}
        </span>
        <label className="hidden items-center gap-1.5 sm:flex">
          Rows
          <select
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
            className="h-7 rounded-lg border bg-background px-1.5 text-xs font-semibold text-foreground"
          >
            {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </div>

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-1">
          <PageButton onClick={() => setPage(page - 1)} disabled={page === 1} label="Previous page">
            <ChevronLeft className="h-3.5 w-3.5" />
          </PageButton>
          {pages.map((p, index) => (
            <span key={p} className="flex items-center gap-1">
              {index > 0 && p - pages[index - 1] > 1 && <span className="px-0.5">…</span>}
              <PageButton onClick={() => setPage(p)} active={p === page} label={`Page ${p}`}>
                {p}
              </PageButton>
            </span>
          ))}
          <PageButton onClick={() => setPage(page + 1)} disabled={page === pageCount} label="Next page">
            <ChevronRight className="h-3.5 w-3.5" />
          </PageButton>
        </nav>
      )}
    </div>
  )
}

function PageButton({
  onClick, disabled, active, label, children,
}: { onClick: () => void; disabled?: boolean; active?: boolean; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-xs font-semibold tabular-nums transition ${
        active
          ? "bg-orange-500 text-white"
          : "text-foreground/80 hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
      }`}
    >
      {children}
    </button>
  )
}
