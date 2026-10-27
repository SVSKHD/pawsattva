"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, CircleDashed, FileText, Lightbulb, Pencil, Plus, Send, Trash2, Upload, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Blog } from "@/firebase/firestore"
import { TablePagination, usePagination } from "./TablePagination"
import {
  ActionButton, ActionsCell, FilterTabs, IconAction, SortHeader, StatusPill, TableCard, TableEmpty,
  TableSearch, TableToolbar, nextSort, rowClass, rowTitleClass, thClass, theadRowClass,
  type PillTone, type SortState,
} from "./DataTable"

interface BlogListTabProps {
  blogs: Blog[]
  filteredBlogs: Blog[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  getCategoryName: (id: string) => string
  onCreate: () => void
  onOpenImport: () => void
  onOpenTips: () => void
  handleEditBlog: (blog: Blog) => void
  handleDeleteBlog: (id: string) => Promise<void>
  handleApproveBlog?: (id: string) => Promise<void>
  handleRejectDeleteRequest?: (id: string) => Promise<void>
  isAuthor?: boolean
}

type StatusTab = "all" | "published" | "draft" | "review"
type SortKey = "title" | "date"

const needsReview = (blog: Blog) => blog.status === "pending_review" || Boolean(blog.deleteRequested)

const STATUS_BADGE: Record<Blog["status"], { label: string; tone: PillTone; icon: typeof CheckCircle2 }> = {
  published: { label: "Published", tone: "emerald", icon: CheckCircle2 },
  draft: { label: "Draft", tone: "amber", icon: CircleDashed },
  pending_review: { label: "In review", tone: "sky", icon: Send },
}

export function BlogListTab({
  blogs,
  filteredBlogs,
  searchQuery,
  setSearchQuery,
  getCategoryName,
  onCreate,
  onOpenImport,
  onOpenTips,
  handleEditBlog,
  handleDeleteBlog,
  handleApproveBlog,
  handleRejectDeleteRequest,
  isAuthor = false,
}: BlogListTabProps) {
  const [tab, setTab] = useState<StatusTab>("all")
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "date", dir: "desc" })
  const [pendingDelete, setPendingDelete] = useState<Blog | null>(null)

  const counts: Record<StatusTab, number> = {
    all: filteredBlogs.length,
    published: filteredBlogs.filter((b) => b.status === "published").length,
    draft: filteredBlogs.filter((b) => b.status === "draft").length,
    review: filteredBlogs.filter(needsReview).length,
  }

  const rows = useMemo(() => {
    const direction = sort.dir === "asc" ? 1 : -1
    return filteredBlogs
      .filter((blog) => (tab === "all" ? true : tab === "review" ? needsReview(blog) : blog.status === tab))
      .sort((a, b) =>
        sort.key === "title"
          ? a.title.localeCompare(b.title) * direction
          : String(a.date ?? "").localeCompare(String(b.date ?? "")) * direction
      )
  }, [filteredBlogs, sort, tab])
  const pagination = usePagination(rows)

  const tabs: { id: StatusTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "published", label: "Published" },
    { id: "draft", label: "Drafts" },
    { id: "review", label: isAuthor ? "Awaiting review" : "Review" },
  ]

  const onSort = (key: SortKey) => {
    setSort((current) => nextSort(current, key, key === "title" ? "asc" : "desc"))
    pagination.reset()
  }

  return (
    <div className="space-y-4">
      <TableCard
        icon={FileText}
        title="Blog posts"
        subtitle={
          <>
            {blogs.filter((b) => b.status === "published").length} published ·{" "}
            {blogs.filter((b) => b.status === "draft").length} drafts
            {counts.review > 0 && <> · <span className="font-semibold text-sky-600">{counts.review} need review</span></>}
          </>
        }
        actions={
          <>
            <ActionButton icon={Lightbulb} onClick={onOpenTips}>Tips &amp; keys</ActionButton>
            <ActionButton icon={Upload} onClick={onOpenImport}>Import JSON</ActionButton>
            <ActionButton variant="primary" icon={Plus} onClick={onCreate}>New post</ActionButton>
          </>
        }
      >
        <TableToolbar>
          <FilterTabs
            label="Filter by status"
            tabs={tabs}
            value={tab}
            onChange={(next) => { setTab(next); pagination.reset() }}
            counts={counts}
            alert={{ id: "review", className: "bg-sky-500" }}
          />
          <TableSearch
            value={searchQuery}
            onChange={(next) => { setSearchQuery(next); pagination.reset() }}
            placeholder="Search posts…"
            label="Search posts"
            className="ml-auto sm:max-w-xs"
          />
        </TableToolbar>

        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={theadRowClass}>
                  <SortHeader label="Title" sortKey="title" sort={sort} onSort={onSort} />
                  <th className={`hidden sm:table-cell ${thClass}`}>Status</th>
                  <th className={`hidden md:table-cell ${thClass}`}>Author</th>
                  <SortHeader label="Date" sortKey="date" sort={sort} onSort={onSort} className="hidden lg:table-cell" />
                  <th className={`w-px ${thClass}`}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {pagination.rows.map((blog) => {
                  const badge = STATUS_BADGE[blog.status] ?? STATUS_BADGE.draft
                  const categoryIds = blog.categoryIds?.length ? blog.categoryIds : blog.categoryId ? [blog.categoryId] : []
                  return (
                    <tr key={blog.id} onClick={() => handleEditBlog(blog)} className={rowClass}>
                      <td className="max-w-0 px-4 py-3 sm:w-1/2">
                        <p className={rowTitleClass}>{blog.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {categoryIds.map((cid) => (
                            <span key={cid} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">{getCategoryName(cid)}</span>
                          ))}
                          {blog.deleteRequested && (
                            <span className="rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:text-red-400">
                              Delete requested
                            </span>
                          )}
                          <span className="hidden truncate font-mono text-[10px] text-muted-foreground xl:inline">/{blog.slug}</span>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <StatusPill tone={badge.tone} icon={badge.icon}>{badge.label}</StatusPill>
                      </td>
                      <td className="hidden px-4 py-3 text-foreground/80 md:table-cell">{blog.authorName || "Unknown"}</td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-muted-foreground lg:table-cell">{blog.date}</td>
                      <ActionsCell>
                        {blog.status === "pending_review" && handleApproveBlog && (
                          <IconAction label="Approve" tone="emerald" onClick={() => handleApproveBlog(blog.id)}>
                            <CheckCircle2 className="h-4 w-4" />
                          </IconAction>
                        )}
                        {blog.deleteRequested && handleRejectDeleteRequest && (
                          <IconAction label="Reject delete request" tone="muted" onClick={() => handleRejectDeleteRequest(blog.id)}>
                            <XCircle className="h-4 w-4" />
                          </IconAction>
                        )}
                        <IconAction label="Edit" tone="orange" onClick={() => handleEditBlog(blog)}>
                          <Pencil className="h-4 w-4" />
                        </IconAction>
                        <IconAction label={isAuthor ? "Request delete" : "Delete"} tone="red" onClick={() => setPendingDelete(blog)}>
                          <Trash2 className="h-4 w-4" />
                        </IconAction>
                      </ActionsCell>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : searchQuery ? (
          <TableEmpty icon={FileText} title={`No posts match “${searchQuery}”`}>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setSearchQuery("")}>Clear search</Button>
          </TableEmpty>
        ) : tab === "all" ? (
          <TableEmpty icon={FileText} title="No posts yet">
            <Button size="sm" className="rounded-xl bg-orange-500 text-white hover:bg-orange-600" onClick={onCreate}>
              <Plus className="h-4 w-4" /> Write your first post
            </Button>
          </TableEmpty>
        ) : (
          <TableEmpty
            icon={FileText}
            title={tab === "review" ? "Nothing waiting for review" : `No ${tab === "draft" ? "drafts" : "published posts"}`}
          />
        )}

        <TablePagination pagination={pagination} noun={rows.length === 1 ? "post" : "posts"} />
      </TableCard>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{isAuthor ? "Request delete?" : "Delete this post?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isAuthor
                ? `Send a delete request for “${pendingDelete?.title}” to an admin?`
                : `“${pendingDelete?.title}” will be permanently deleted. This can't be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingDelete) void handleDeleteBlog(pendingDelete.id)
                setPendingDelete(null)
              }}
            >
              {isAuthor ? "Send request" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
