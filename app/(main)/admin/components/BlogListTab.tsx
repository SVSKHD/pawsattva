"use client"

import { Edit, Trash2, Search, CheckCircle2, CircleDashed, Send, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Blog } from "@/firebase/firestore"

interface BlogListTabProps {
  blogs: Blog[]
  filteredBlogs: Blog[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  getCategoryName: (id: string) => string
  handleEditBlog: (blog: Blog) => void
  handleDeleteBlog: (id: string) => Promise<void>
  handleApproveBlog?: (id: string) => Promise<void>
  handleRejectDeleteRequest?: (id: string) => Promise<void>
  isAuthor?: boolean
}

export function BlogListTab({
  blogs,
  filteredBlogs,
  searchQuery,
  setSearchQuery,
  getCategoryName,
  handleEditBlog,
  handleDeleteBlog,
  handleApproveBlog,
  handleRejectDeleteRequest,
  isAuthor = false,
}: BlogListTabProps) {
  const pendingBlogs = filteredBlogs.filter(b => b.status === "pending_review")
  const publishedBlogs = filteredBlogs.filter(b => b.status === "published")
  const draftBlogs = filteredBlogs.filter(b => b.status === "draft")

  const renderRows = (rows: Blog[], tone: "emerald" | "amber" | "sky") => rows.length > 0
    ? rows.map((blog) => (
      <tr key={blog.id} className={`group transition-colors ${tone === "emerald" ? "hover:bg-emerald-500/5" : tone === "sky" ? "hover:bg-sky-500/5" : "hover:bg-amber-500/5"}`}>
        <td className="px-3 sm:px-6 md:px-8 py-3 sm:py-4">
          <span className="font-bold text-sm sm:text-base text-foreground group-hover:text-orange-700 transition-colors line-clamp-2">{blog.title}</span>
          <div className="flex flex-wrap items-center gap-1 mt-1">
            {(blog.categoryIds?.length ? blog.categoryIds : blog.categoryId ? [blog.categoryId] : []).map(cid => (
              <span key={cid} className="text-[10px] font-semibold bg-muted px-1.5 py-0.5 rounded-full">{getCategoryName(cid)}</span>
            ))}
            {blog.deleteRequested && <span className="text-[10px] font-bold bg-red-500/10 text-red-700 border border-red-500/15 px-1.5 py-0.5 rounded-full">Delete requested</span>}
            <span className="hidden sm:inline text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">/{blog.slug}</span>
          </div>
        </td>
        <td className="hidden md:table-cell px-4 md:px-8 py-4 text-sm text-foreground/70 font-medium">{blog.authorName || "Unknown"}</td>
        <td className="hidden lg:table-cell px-4 md:px-8 py-4 text-sm text-muted-foreground">{blog.date}</td>
        <td className="px-3 sm:px-6 md:px-8 py-3 sm:py-4 text-right">
          <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            {blog.status === "pending_review" && handleApproveBlog && (
              <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3 bg-emerald-500/10 border-emerald-500/20 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg" onClick={() => handleApproveBlog(blog.id)}>
                <CheckCircle2 className="w-4 h-4 md:mr-1.5" /><span className="hidden md:inline">Approve</span>
              </Button>
            )}
            {blog.deleteRequested && handleRejectDeleteRequest && (
              <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3 bg-white/50 dark:bg-black/50 border-white/20 text-muted-foreground hover:text-foreground rounded-lg" onClick={() => handleRejectDeleteRequest(blog.id)}>
                <XCircle className="w-4 h-4 md:mr-1.5" /><span className="hidden md:inline">Reject</span>
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3 bg-white/50 dark:bg-black/50 border-white/20 text-orange-600 hover:bg-orange-600 hover:text-white rounded-lg transition-all" onClick={() => handleEditBlog(blog)}>
              <Edit className="w-4 h-4 md:mr-1.5" /><span className="hidden md:inline">Edit</span>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3 bg-white/50 dark:bg-black/50 border-white/20 text-destructive hover:bg-destructive hover:text-white rounded-lg transition-all">
                  <Trash2 className="w-4 h-4 md:mr-1.5" /><span className="hidden md:inline">{isAuthor ? "Request" : "Delete"}</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="p-5 sm:p-10 rounded-2xl sm:rounded-[2rem] border-white/30 dark:border-white/10 backdrop-blur-3xl bg-white/90 dark:bg-black/90 shadow-2xl mx-4 sm:mx-auto">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl sm:text-2xl p-1 sm:p-2 font-bold">{isAuthor ? "Request Delete?" : "Confirm Deletion"}</AlertDialogTitle>
                  <hr className="border-black/20" />
                  <AlertDialogDescription className="text-sm sm:text-base text-muted-foreground">
                    {isAuthor ? `Send a delete request for "${blog.title}" to admin?` : `Are you sure you want to permanently delete "${blog.title}"? This action cannot be undone.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4 sm:mt-6 border-0 bg-transparent gap-2 sm:gap-3 px-0 pb-0">
                  <AlertDialogCancel className="pt-2 h-10 sm:h-11 rounded-xl bg-muted/50 border-0 hover:bg-muted transition-all text-sm">No, Cancel</AlertDialogCancel>
                  <AlertDialogAction className="p-2 h-10 sm:h-11 rounded-xl bg-destructive hover:bg-destructive/90 transition-all shadow-lg shadow-destructive/20 border-0 text-sm" onClick={() => handleDeleteBlog(blog.id)}>{isAuthor ? "Send Request" : "Yes, Delete"}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </td>
      </tr>
    ))
    : <tr><td colSpan={4} className="px-4 sm:px-8 py-12 text-center text-muted-foreground text-sm font-medium">No posts in this section.</td></tr>

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Manage Blogs</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            <span className="font-semibold text-emerald-600">{blogs.filter(b => b.status === 'published').length} published</span>
            {" · "}
            <span className="font-semibold text-amber-600">{blogs.filter(b => b.status === 'draft').length} drafts</span>
            {" · "}
            <span className="font-semibold text-sky-600">{blogs.filter(b => b.status === 'pending_review').length} pending review</span>
          </p>
        </div>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            className="pl-10 h-10 bg-white/50 dark:bg-black/50 border-white/20 dark:border-white/10 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {pendingBlogs.length > 0 && (
      <div className="rounded-2xl sm:rounded-[1.75rem] border border-sky-500/20 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-xl overflow-hidden">
        <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-3 sm:py-4 bg-sky-500/5 border-b border-sky-500/15">
          <div className="w-1 h-6 rounded-full bg-sky-500" />
          <Send className="w-4 h-4 text-sky-600" />
          <span className="font-bold text-sky-700 dark:text-sky-400 text-xs sm:text-sm uppercase tracking-widest">Pending Admin Review</span>
          <span className="ml-auto text-xs font-bold bg-sky-500/15 text-sky-700 dark:text-sky-400 px-2.5 py-0.5 rounded-full border border-sky-500/20">{pendingBlogs.length}</span>
        </div>
        <BlogTable>{renderRows(pendingBlogs, "sky")}</BlogTable>
      </div>
      )}

      {/* ── PUBLISHED ── */}
      <div className="rounded-2xl sm:rounded-[1.75rem] border border-emerald-500/20 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-xl overflow-hidden">
        <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-3 sm:py-4 bg-emerald-500/5 border-b border-emerald-500/15">
          <div className="w-1 h-6 rounded-full bg-emerald-500" />
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm uppercase tracking-widest">Published</span>
          <span className="ml-auto text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            {filteredBlogs.filter(b => b.status === 'published').length}
          </span>
        </div>
        <BlogTable>{renderRows(publishedBlogs, "emerald")}</BlogTable>
      </div>

      {/* ── DRAFTS ── */}
      <div className="rounded-2xl sm:rounded-[1.75rem] border border-amber-500/20 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-xl overflow-hidden">
        <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-3 sm:py-4 bg-amber-500/5 border-b border-amber-500/15">
          <div className="w-1 h-6 rounded-full bg-amber-500" />
          <CircleDashed className="w-4 h-4 text-amber-600" />
          <span className="font-bold text-amber-700 dark:text-amber-400 text-xs sm:text-sm uppercase tracking-widest">Drafts</span>
          <span className="ml-auto text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/20">
            {filteredBlogs.filter(b => b.status === 'draft').length}
          </span>
        </div>
        <BlogTable>{renderRows(draftBlogs, "amber")}</BlogTable>
      </div>
    </div>
  )
}

function BlogTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-h-[430px] overflow-auto">
      <table className="w-full text-left">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-border/30 bg-white/80 backdrop-blur dark:bg-black/80">
            <th className="px-3 sm:px-6 md:px-8 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Title &amp; Category</th>
            <th className="hidden md:table-cell px-4 md:px-8 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Author</th>
            <th className="hidden lg:table-cell px-4 md:px-8 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Date</th>
            <th className="px-3 sm:px-6 md:px-8 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">{children}</tbody>
      </table>
    </div>
  )
}
