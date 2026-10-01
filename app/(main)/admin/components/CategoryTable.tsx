"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, CircleDashed, CornerDownRight, FolderOpen, Pencil, Plus, Search, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Category } from "@/firebase/firestore"

type StatusFilter = "all" | "published" | "draft"

interface CategoryTableProps {
  kind: "category" | "sub-category"
  /** Rows to show: top-level categories or sub-categories */
  items: Category[]
  /** Every category, used for parent names and sub-category counts */
  allCategories: Category[]
  /** Blog posts per category id */
  postCounts: Record<string, number>
  onCreate: () => void
  onEdit: (cat: Category) => void
  onDelete: (id: string, name: string) => void
}

/** Shared list for the Categories and Sub-Categories tabs */
export function CategoryTable({ kind, items, allCategories, postCounts, onCreate, onEdit, onDelete }: CategoryTableProps) {
  const isSub = kind === "sub-category"
  const noun = isSub ? "sub-category" : "category"
  const nounPlural = isSub ? "sub-categories" : "categories"

  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [parentFilter, setParentFilter] = useState("all")
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null)

  const nameOf = (id?: string) => allCategories.find((c) => c.id === id)?.name ?? "—"
  const subCount = (id: string) => allCategories.filter((c) => c.parentId === id).length
  const statusOf = (cat: Category): "published" | "draft" => (cat.status === "published" ? "published" : "draft")

  const parents = useMemo(
    () => allCategories.filter((c) => !c.parentId).sort((a, b) => a.name.localeCompare(b.name)),
    [allCategories]
  )

  const counts = {
    all: items.length,
    published: items.filter((c) => statusOf(c) === "published").length,
    draft: items.filter((c) => statusOf(c) === "draft").length,
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items
      .filter((c) => status === "all" || (c.status === "published" ? "published" : "draft") === status)
      .filter((c) => !isSub || parentFilter === "all" || c.parentId === parentFilter)
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
      .sort((a, b) => {
        if (isSub) {
          const byParent = (allCategories.find((c) => c.id === a.parentId)?.name ?? "")
            .localeCompare(allCategories.find((c) => c.id === b.parentId)?.name ?? "")
          if (byParent) return byParent
        }
        return a.name.localeCompare(b.name)
      })
  }, [items, allCategories, query, status, parentFilter, isSub])

  const filtersActive = query.trim() !== "" || status !== "all" || parentFilter !== "all"
  const clearFilters = () => { setQuery(""); setStatus("all"); setParentFilter("all") }

  return (
    <div className="space-y-4">
      {/* Title + primary action */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold capitalize">{nounPlural}</h2>
          <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
            {isSub ? "Nested topics shown under a parent category." : "Top-level topics that group your blog posts."}
          </p>
        </div>
        <Button
          onClick={onCreate}
          className="h-9 sm:h-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 font-bold text-white shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-amber-600 border-0"
        >
          <Plus className="h-4 w-4" />
          New {noun}
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 shadow-sm backdrop-blur-xl">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border/50 p-3">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${nounPlural}…`}
              aria-label={`Search ${nounPlural}`}
              className="h-9 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/30 pl-9 pr-8 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {isSub && (
            <Select value={parentFilter} onValueChange={setParentFilter}>
              <SelectTrigger className="h-9 w-[180px] rounded-xl bg-white/70 dark:bg-black/30 text-sm" aria-label="Filter by parent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All parents</SelectItem>
                {parents.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div role="tablist" aria-label="Filter by status" className="flex items-center rounded-xl bg-muted/60 p-1">
            {(["all", "published", "draft"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={status === value}
                onClick={() => setStatus(value)}
                className={`inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold capitalize transition ${
                  status === value ? "bg-white text-foreground shadow-sm dark:bg-zinc-900" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {value === "draft" ? "Drafts" : value}
                <span className="tabular-nums text-[10px] text-muted-foreground">{counts[value]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 font-semibold">Name</th>
                  {isSub && <th className="hidden md:table-cell px-4 py-2.5 font-semibold">Parent</th>}
                  <th className="hidden sm:table-cell px-4 py-2.5 font-semibold">Status</th>
                  {!isSub && <th className="hidden md:table-cell px-4 py-2.5 font-semibold text-right">Subs</th>}
                  <th className="hidden md:table-cell px-4 py-2.5 font-semibold text-right">Posts</th>
                  <th className="w-px px-4 py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {rows.map((cat) => {
                  const published = statusOf(cat) === "published"
                  return (
                    <tr
                      key={cat.id}
                      onClick={() => onEdit(cat)}
                      className="group cursor-pointer transition-colors hover:bg-orange-500/[0.04]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {cat.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cat.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-black/5" />
                          ) : (
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-sm font-bold text-orange-600">
                              {cat.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground group-hover:text-orange-700 dark:group-hover:text-orange-300">
                              {cat.name}
                            </p>
                            <p className="max-w-[28rem] truncate text-xs text-muted-foreground">
                              {isSub && (
                                <span className="md:hidden">
                                  <CornerDownRight className="mr-1 inline h-3 w-3" />
                                  {nameOf(cat.parentId)} ·{" "}
                                </span>
                              )}
                              {cat.description || <span className="italic opacity-60">No description</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      {isSub && (
                        <td className="hidden md:table-cell px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-md bg-muted/70 px-2 py-0.5 text-xs font-medium text-foreground/80">
                            <FolderOpen className="h-3 w-3 text-muted-foreground" />
                            {nameOf(cat.parentId)}
                          </span>
                        </td>
                      )}
                      <td className="hidden sm:table-cell px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            published
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {published ? <CheckCircle2 className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />}
                          {published ? "Published" : "Draft"}
                        </span>
                      </td>
                      {!isSub && (
                        <td className="hidden md:table-cell px-4 py-3 text-right tabular-nums text-muted-foreground">{subCount(cat.id)}</td>
                      )}
                      <td className="hidden md:table-cell px-4 py-3 text-right tabular-nums text-muted-foreground">{postCounts[cat.id] ?? 0}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => onEdit(cat)}
                            aria-label={`Edit ${cat.name}`}
                            title="Edit"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-orange-500/10 hover:text-orange-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDelete(cat)}
                            aria-label={`Delete ${cat.name}`}
                            title="Delete"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-red-500/10 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600">
              <FolderOpen className="h-6 w-6" />
            </span>
            {filtersActive ? (
              <>
                <p className="text-sm font-semibold">No {nounPlural} match these filters</p>
                <Button variant="outline" size="sm" className="rounded-xl" onClick={clearFilters}>Clear filters</Button>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">No {nounPlural} yet</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  {isSub ? "Create a sub-category to organise posts inside a parent category." : "Create your first category to start organising posts."}
                </p>
                <Button size="sm" className="rounded-xl bg-orange-500 text-white hover:bg-orange-600" onClick={onCreate}>
                  <Plus className="h-4 w-4" /> New {noun}
                </Button>
              </>
            )}
          </div>
        )}

        {rows.length > 0 && (
          <div className="border-t border-border/50 px-4 py-2 text-[11px] text-muted-foreground">
            Showing {rows.length} of {items.length} {items.length === 1 ? noun : nounPlural} · click a row to edit
          </div>
        )}
      </div>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{pendingDelete?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This can&apos;t be undone.
              {pendingDelete && (postCounts[pendingDelete.id] ?? 0) > 0 &&
                ` ${postCounts[pendingDelete.id]} post(s) are filed under this ${noun}.`}
              {pendingDelete && !isSub && subCount(pendingDelete.id) > 0 &&
                ` It has ${subCount(pendingDelete.id)} sub-categor${subCount(pendingDelete.id) === 1 ? "y" : "ies"} — you'll be asked how to handle them next.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingDelete) onDelete(pendingDelete.id, pendingDelete.name)
                setPendingDelete(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
