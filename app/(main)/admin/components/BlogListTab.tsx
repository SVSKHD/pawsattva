"use client"

import { useState } from "react"
import { CheckCircle2, CircleDashed, FileText, Pencil, Plus, Search, Send, Trash2, X, XCircle } from "lucide-react"
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

interface BlogListTabProps {
  blogs: Blog[]
  filteredBlogs: Blog[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  getCategoryName: (id: string) => string
  onCreate: () => void
  handleEditBlog: (blog: Blog) => void
  handleDeleteBlog: (id: string) => Promise<void>
  handleApproveBlog?: (id: string) => Promise<void>
  handleRejectDeleteRequest?: (id: string) => Promise<void>
  isAuthor?: boolean
}

type StatusTab = "all" | "published" | "draft" | "review"

const needsReview = (blog: Blog) => blog.status === "pending_review" || Boolean(blog.deleteRequested)

const STATUS_BADGE: Record<Blog["status"], { label: string; className: string; icon: typeof CheckCircle2 }> = {
  published: { label: "Published", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", icon: CheckCircle2 },
  draft: { label: "Draft", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400", icon: CircleDashed },
  pending_review: { label: "In review", className: "bg-sky-500/10 text-sky-700 dark:text-sky-400", icon: Send },
}

export function BlogListTab({
  blogs,
  filteredBlogs,
  searchQuery,
  setSearchQuery,
  getCategoryName,
  onCreate,
  handleEditBlog,
  handleDeleteBlog,
  handleApproveBlog,
  handleRejectDeleteRequest,
  isAuthor = false,
}: BlogListTabProps) {
  const [tab, setTab] = useState<StatusTab>("all")
  const [pendingDelete, setPendingDelete] = useState<Blog | null>(null)

  const counts: Record<StatusTab, number> = {
    all: filteredBlogs.length,
    published: filteredBlogs.filter((b) => b.status === "published").length,
    draft: filteredBlogs.filter((b) => b.status === "draft").length,
    review: filteredBlogs.filter(needsReview).length,
  }

  const rows = filteredBlogs.filter((blog) =>
    tab === "all" ? true : tab === "review" ? needsReview(blog) : blog.status === tab
  )
  const pagination = usePagination(rows)

  const tabs: { id: StatusTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "published", label: "Published" },
    { id: "draft", label: "Drafts" },
    { id: "review", label: isAuthor ? "Awaiting review" : "Review" },
  ]

  return (
    <div className="space-y-4">
      {/* Title + primary action */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Blog posts</h2>
          <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
            {blogs.filter((b) => b.status === "published").length} published ·{" "}
            {blogs.filter((b) => b.status === "draft").length} drafts
            {counts.review > 0 && <> · <span className="font-semibold text-sky-600">{counts.review} need review</span></>}
          </p>
        </div>
        <Button
          onClick={onCreate}
          className="h-9 sm:h-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 font-bold text-white shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-amber-600 border-0"
        >
          <Plus className="h-4 w-4" /> New post
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 shadow-sm backdrop-blur-xl">
        {/* Toolbar: status tabs + search */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border/50 p-3">
          <div role="tablist" aria-label="Filter by status" className="flex max-w-full items-center overflow-x-auto rounded-xl bg-muted/60 p-1">
            {tabs.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => { setTab(id); pagination.reset() }}
                className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition ${
                  tab === id ? "bg-white text-foreground shadow-sm dark:bg-zinc-900" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
                <span
                  className={`tabular-nums text-[10px] ${
                    id === "review" && counts.review > 0 ? "rounded-full bg-sky-500 px-1.5 text-white" : "text-muted-foreground"
                  }`}
                >
                  {counts[id]}
                </span>
              </button>
            ))}
          </div>

          <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); pagination.reset() }}
              placeholder="Search posts…"
              aria-label="Search posts"
              className="h-9 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/30 pl-9 pr-8 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 font-semibold">Title</th>
                  <th className="hidden sm:table-cell px-4 py-2.5 font-semibold">Status</th>
                  <th className="hidden md:table-cell px-4 py-2.5 font-semibold">Author</th>
                  <th className="hidden lg:table-cell px-4 py-2.5 font-semibold">Date</th>
                  <th className="w-px px-4 py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {pagination.rows.map((blog) => {
                  const badge = STATUS_BADGE[blog.status] ?? STATUS_BADGE.draft
                  const BadgeIcon = badge.icon
                  const categoryIds = blog.categoryIds?.length ? blog.categoryIds : blog.categoryId ? [blog.categoryId] : []
                  return (
                    <tr
                      key={blog.id}
                      onClick={() => handleEditBlog(blog)}
                      className="group cursor-pointer transition-colors hover:bg-orange-500/[0.04]"
                    >
                      <td className="max-w-0 px-4 py-3 sm:w-1/2">
                        <p className="truncate font-semibold text-foreground group-hover:text-orange-700 dark:group-hover:text-orange-300">
                          {blog.title}
                        </p>
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
                      <td className="hidden sm:table-cell px-4 py-3">
                        <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
                          <BadgeIcon className="h-3 w-3" />
                          {badge.label}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-foreground/80">{blog.authorName || "Unknown"}</td>
                      <td className="hidden lg:table-cell whitespace-nowrap px-4 py-3 text-muted-foreground">{blog.date}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {blog.status === "pending_review" && handleApproveBlog && (
                            <IconAction label="Approve" onClick={() => handleApproveBlog(blog.id)} className="hover:bg-emerald-500/10 hover:text-emerald-600">
                              <CheckCircle2 className="h-4 w-4" />
                            </IconAction>
                          )}
                          {blog.deleteRequested && handleRejectDeleteRequest && (
                            <IconAction label="Reject delete request" onClick={() => handleRejectDeleteRequest(blog.id)} className="hover:bg-muted hover:text-foreground">
                              <XCircle className="h-4 w-4" />
                            </IconAction>
                          )}
                          <IconAction label="Edit" onClick={() => handleEditBlog(blog)} className="hover:bg-orange-500/10 hover:text-orange-600">
                            <Pencil className="h-4 w-4" />
                          </IconAction>
                          <IconAction
                            label={isAuthor ? "Request delete" : "Delete"}
                            onClick={() => setPendingDelete(blog)}
                            className="hover:bg-red-500/10 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </IconAction>
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
              <FileText className="h-6 w-6" />
            </span>
            {searchQuery ? (
              <>
                <p className="text-sm font-semibold">No posts match “{searchQuery}”</p>
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setSearchQuery("")}>Clear search</Button>
              </>
            ) : tab === "all" ? (
              <>
                <p className="text-sm font-semibold">No posts yet</p>
                <Button size="sm" className="rounded-xl bg-orange-500 text-white hover:bg-orange-600" onClick={onCreate}>
                  <Plus className="h-4 w-4" /> Write your first post
                </Button>
              </>
            ) : (
              <p className="text-sm font-semibold">
                {tab === "review" ? "Nothing waiting for review" : `No ${tab === "draft" ? "drafts" : "published posts"}`}
              </p>
            )}
          </div>
        )}

        <TablePagination pagination={pagination} noun={rows.length === 1 ? "post" : "posts"} />
      </div>

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

function IconAction({
  label, onClick, className, children,
}: { label: string; onClick: () => void; className: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition ${className}`}
    >
      {children}
    </button>
  )
}
