"use client"

import { Edit, Trash2, Search, CheckCircle2, CircleDashed } from "lucide-react"
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
}

export function BlogListTab({
  blogs,
  filteredBlogs,
  searchQuery,
  setSearchQuery,
  getCategoryName,
  handleEditBlog,
  handleDeleteBlog,
}: BlogListTabProps) {
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
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border/30 bg-white/10 dark:bg-black/10">
                <th className="px-3 sm:px-6 md:px-8 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Title &amp; Category</th>
                <th className="hidden md:table-cell px-4 md:px-8 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Author</th>
                <th className="hidden lg:table-cell px-4 md:px-8 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="px-3 sm:px-6 md:px-8 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredBlogs.filter(b => b.status === 'published').length > 0
                ? filteredBlogs.filter(b => b.status === 'published').map((blog) => (
                  <tr key={blog.id} className="group hover:bg-emerald-500/5 transition-colors">
                    <td className="px-3 sm:px-6 md:px-8 py-3 sm:py-4">
                      <span className="font-bold text-sm sm:text-base text-foreground group-hover:text-emerald-700 transition-colors line-clamp-2">{blog.title}</span>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {(blog.categoryIds?.length ? blog.categoryIds : blog.categoryId ? [blog.categoryId] : []).map(cid => (
                          <span key={cid} className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/15 px-1.5 py-0.5 rounded-full">{getCategoryName(cid)}</span>
                        ))}
                        <span className="hidden sm:inline text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">/{blog.slug}</span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-4 md:px-8 py-4 text-sm text-foreground/70 font-medium">{blog.authorName || "Unknown"}</td>
                    <td className="hidden lg:table-cell px-4 md:px-8 py-4 text-sm text-muted-foreground">{blog.date}</td>
                    <td className="px-3 sm:px-6 md:px-8 py-3 sm:py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                        <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3 bg-white/50 dark:bg-black/50 border-white/20 text-orange-600 hover:bg-orange-600 hover:text-white rounded-lg transition-all" onClick={() => handleEditBlog(blog)}>
                          <Edit className="w-4 h-4 md:mr-1.5" /><span className="hidden md:inline">Edit</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3 bg-white/50 dark:bg-black/50 border-white/20 text-destructive hover:bg-destructive hover:text-white rounded-lg transition-all">
                              <Trash2 className="w-4 h-4 md:mr-1.5" /><span className="hidden md:inline">Delete</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="p-5 sm:p-10 rounded-2xl sm:rounded-[2rem] border-white/30 dark:border-white/10 backdrop-blur-3xl bg-white/90 dark:bg-black/90 shadow-2xl mx-4 sm:mx-auto">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-xl sm:text-2xl p-1 sm:p-2 font-bold">Confirm Deletion</AlertDialogTitle>
                              <hr className="border-black/20" />
                              <AlertDialogDescription className="text-sm sm:text-base text-muted-foreground">Are you sure you want to permanently delete &quot;{blog.title}&quot;? This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-4 sm:mt-6 border-0 bg-transparent gap-2 sm:gap-3 px-0 pb-0">
                              <AlertDialogCancel className="pt-2 h-10 sm:h-11 rounded-xl bg-muted/50 border-0 hover:bg-muted transition-all text-sm">No, Cancel</AlertDialogCancel>
                              <AlertDialogAction className="p-2 h-10 sm:h-11 rounded-xl bg-destructive hover:bg-destructive/90 transition-all shadow-lg shadow-destructive/20 border-0 text-sm" onClick={() => handleDeleteBlog(blog.id)}>Yes, Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))
                : <tr><td colSpan={4} className="px-4 sm:px-8 py-12 text-center text-muted-foreground text-sm font-medium">No published posts yet.</td></tr>}
            </tbody>
          </table>
        </div>
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
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border/30 bg-white/10 dark:bg-black/10">
                <th className="px-3 sm:px-6 md:px-8 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Title &amp; Category</th>
                <th className="hidden md:table-cell px-4 md:px-8 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Author</th>
                <th className="hidden lg:table-cell px-4 md:px-8 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="px-3 sm:px-6 md:px-8 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredBlogs.filter(b => b.status === 'draft').length > 0
                ? filteredBlogs.filter(b => b.status === 'draft').map((blog) => (
                  <tr key={blog.id} className="group hover:bg-amber-500/5 transition-colors">
                    <td className="px-3 sm:px-6 md:px-8 py-3 sm:py-4">
                      <span className="font-bold text-sm sm:text-base text-foreground/75 group-hover:text-amber-700 transition-colors line-clamp-2">{blog.title}</span>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {(blog.categoryIds?.length ? blog.categoryIds : blog.categoryId ? [blog.categoryId] : []).map(cid => (
                          <span key={cid} className="text-[10px] font-semibold bg-amber-500/10 text-amber-700 border border-amber-500/15 px-1.5 py-0.5 rounded-full">{getCategoryName(cid)}</span>
                        ))}
                        <span className="hidden sm:inline text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">/{blog.slug}</span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-4 md:px-8 py-4 text-sm text-foreground/70 font-medium">{blog.authorName || "Unknown"}</td>
                    <td className="hidden lg:table-cell px-4 md:px-8 py-4 text-sm text-muted-foreground">{blog.date}</td>
                    <td className="px-3 sm:px-6 md:px-8 py-3 sm:py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                        <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3 bg-white/50 dark:bg-black/50 border-white/20 text-orange-600 hover:bg-orange-600 hover:text-white rounded-lg transition-all" onClick={() => handleEditBlog(blog)}>
                          <Edit className="w-4 h-4 md:mr-1.5" /><span className="hidden md:inline">Edit</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3 bg-white/50 dark:bg-black/50 border-white/20 text-destructive hover:bg-destructive hover:text-white rounded-lg transition-all">
                              <Trash2 className="w-4 h-4 md:mr-1.5" /><span className="hidden md:inline">Delete</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="p-5 sm:p-10 rounded-2xl sm:rounded-[2rem] border-white/30 dark:border-white/10 backdrop-blur-3xl bg-white/90 dark:bg-black/90 shadow-2xl mx-4 sm:mx-auto">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-xl sm:text-2xl p-1 sm:p-2 font-bold">Confirm Deletion</AlertDialogTitle>
                              <hr className="border-black/20" />
                              <AlertDialogDescription className="text-sm sm:text-base text-muted-foreground">Are you sure you want to permanently delete &quot;{blog.title}&quot;? This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-4 sm:mt-6 border-0 bg-transparent gap-2 sm:gap-3 px-0 pb-0">
                              <AlertDialogCancel className="pt-2 h-10 sm:h-11 rounded-xl bg-muted/50 border-0 hover:bg-muted transition-all text-sm">No, Cancel</AlertDialogCancel>
                              <AlertDialogAction className="p-2 h-10 sm:h-11 rounded-xl bg-destructive hover:bg-destructive/90 transition-all shadow-lg shadow-destructive/20 border-0 text-sm" onClick={() => handleDeleteBlog(blog.id)}>Yes, Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))
                : <tr><td colSpan={4} className="px-4 sm:px-8 py-12 text-center text-muted-foreground text-sm font-medium">No draft posts.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
