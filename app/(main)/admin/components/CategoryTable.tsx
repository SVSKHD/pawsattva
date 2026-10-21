"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, CircleDashed, CornerDownRight, FolderOpen, Pencil, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Category } from "@/firebase/firestore"
import { TablePagination, usePagination } from "./TablePagination"
import {
  ActionsCell, FilterTabs, IconAction, SortHeader, StatusPill, TableCard, TableEmpty, TableHeading,
  TableSearch, TableToolbar, filterSelectClass, nextSort, primaryActionClass, rowClass, rowTitleClass,
  thClass, theadRowClass, type SortState,
} from "./DataTable"

type StatusFilter = "all" | "published" | "draft"
type SortKey = "name" | "posts"

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
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "name", dir: "asc" })
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
    const direction = sort.dir === "asc" ? 1 : -1
    return items
      .filter((c) => status === "all" || (c.status === "published" ? "published" : "draft") === status)
      .filter((c) => !isSub || parentFilter === "all" || c.parentId === parentFilter)
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sort.key === "posts") return ((postCounts[a.id] ?? 0) - (postCounts[b.id] ?? 0)) * direction
        if (isSub) {
          const byParent = (allCategories.find((c) => c.id === a.parentId)?.name ?? "")
            .localeCompare(allCategories.find((c) => c.id === b.parentId)?.name ?? "")
          if (byParent) return byParent * direction
        }
        return a.name.localeCompare(b.name) * direction
      })
  }, [items, allCategories, postCounts, query, status, parentFilter, isSub, sort])

  const filtersActive = query.trim() !== "" || status !== "all" || parentFilter !== "all"
  const pagination = usePagination(rows)
  const clearFilters = () => { setQuery(""); setStatus("all"); setParentFilter("all"); pagination.reset() }
  const onSort = (key: SortKey) => {
    setSort((current) => nextSort(current, key, key === "name" ? "asc" : "desc"))
    pagination.reset()
  }

  return (
    <div className="space-y-4">
      <TableHeading
        title={nounPlural}
        subtitle={isSub ? "Nested topics shown under a parent category." : "Top-level topics that group your blog posts."}
        action={
          <Button onClick={onCreate} className={primaryActionClass}>
            <Plus className="h-4 w-4" />
            New {noun}
          </Button>
        }
      />

      <TableCard>
        <TableToolbar>
          <FilterTabs
            label="Filter by status"
            tabs={[{ id: "all", label: "All" }, { id: "published", label: "Published" }, { id: "draft", label: "Drafts" }]}
            value={status}
            onChange={(next) => { setStatus(next); pagination.reset() }}
            counts={counts}
          />
          <div className="ml-auto flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {isSub && (
              <Select value={parentFilter} onValueChange={(value) => { setParentFilter(value); pagination.reset() }}>
                <SelectTrigger className={`w-full sm:w-44 ${filterSelectClass}`} aria-label="Filter by parent">
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
            <TableSearch
              value={query}
              onChange={(next) => { setQuery(next); pagination.reset() }}
              placeholder={`Search ${nounPlural}…`}
              label={`Search ${nounPlural}`}
              className="sm:w-64 sm:flex-none"
            />
          </div>
        </TableToolbar>

        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={theadRowClass}>
                  <SortHeader label="Name" sortKey="name" sort={sort} onSort={onSort} />
                  {isSub && <th className={`hidden md:table-cell ${thClass}`}>Parent</th>}
                  <th className={`hidden sm:table-cell ${thClass}`}>Status</th>
                  {!isSub && <th className={`hidden text-right md:table-cell ${thClass}`}>Subs</th>}
                  <SortHeader label="Posts" sortKey="posts" sort={sort} onSort={onSort} className="hidden text-right md:table-cell" />
                  <th className={`w-px ${thClass}`}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {pagination.rows.map((cat) => {
                  const published = statusOf(cat) === "published"
                  return (
                    <tr key={cat.id} onClick={() => onEdit(cat)} className={rowClass}>
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
                            <p className={rowTitleClass}>{cat.name}</p>
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
                        <td className="hidden px-4 py-3 md:table-cell">
                          <span className="inline-flex items-center gap-1 rounded-md bg-muted/70 px-2 py-0.5 text-xs font-medium text-foreground/80">
                            <FolderOpen className="h-3 w-3 text-muted-foreground" />
                            {nameOf(cat.parentId)}
                          </span>
                        </td>
                      )}
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <StatusPill tone={published ? "emerald" : "amber"} icon={published ? CheckCircle2 : CircleDashed}>
                          {published ? "Published" : "Draft"}
                        </StatusPill>
                      </td>
                      {!isSub && (
                        <td className="hidden px-4 py-3 text-right tabular-nums text-muted-foreground md:table-cell">{subCount(cat.id)}</td>
                      )}
                      <td className="hidden px-4 py-3 text-right tabular-nums text-muted-foreground md:table-cell">{postCounts[cat.id] ?? 0}</td>
                      <ActionsCell>
                        <IconAction label={`Edit ${cat.name}`} tone="orange" onClick={() => onEdit(cat)}>
                          <Pencil className="h-4 w-4" />
                        </IconAction>
                        <IconAction label={`Delete ${cat.name}`} tone="red" onClick={() => setPendingDelete(cat)}>
                          <Trash2 className="h-4 w-4" />
                        </IconAction>
                      </ActionsCell>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : filtersActive ? (
          <TableEmpty icon={FolderOpen} title={`No ${nounPlural} match these filters`}>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={clearFilters}>Clear filters</Button>
          </TableEmpty>
        ) : (
          <TableEmpty
            icon={FolderOpen}
            title={`No ${nounPlural} yet`}
            description={isSub ? "Create a sub-category to organise posts inside a parent category." : "Create your first category to start organising posts."}
          >
            <Button size="sm" className="rounded-xl bg-orange-500 text-white hover:bg-orange-600" onClick={onCreate}>
              <Plus className="h-4 w-4" /> New {noun}
            </Button>
          </TableEmpty>
        )}

        <TablePagination pagination={pagination} noun={rows.length === 1 ? noun : nounPlural} />
      </TableCard>

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
