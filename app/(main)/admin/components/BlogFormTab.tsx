"use client"

import {
  PlusCircle, Edit, Save, CheckCircle2, CircleDashed, Trash2,
  ChevronRight, UploadCloud, Settings2, History
} from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
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
import Editor from "@/components/editor"
import { Category, UserProfile } from "@/firebase/firestore"
import { useState } from "react"

interface BlogFormTabProps {
  blogTitle: string
  blogSlug: string
  setBlogSlug: (v: string) => void
  blogKeywords: string
  setBlogKeywords: (v: string) => void
  blogExcerpt: string
  setBlogExcerpt: (v: string) => void
  blogImage: string
  setBlogImage: (v: string) => void
  handleFeaturedImageUpload: (file: File) => Promise<void>
  uploadingFeaturedImage: boolean
  blogContent: string
  setBlogContent: (v: string) => void
  blogCategories: string[]
  setBlogCategories: React.Dispatch<React.SetStateAction<string[]>>
  blogAuthorId: string
  setBlogAuthorId: (v: string) => void
  blogStatus: "published" | "draft"
  setBlogStatus: (v: "published" | "draft") => void
  instagramAutoPost: boolean
  setInstagramAutoPost: (v: boolean) => void
  instagramCaption: string
  setInstagramCaption: (v: string) => void
  editingBlogId: string | null
  categories: Category[]
  authors: UserProfile[]
  savedDraft: { savedAt: string } | null
  hasDraftContent: () => boolean
  restoreDraft: () => void
  discardDraft: () => void
  formatDraftTime: (iso: string) => string
  handleBlogSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  handleTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onCancel: () => void
}

export function BlogFormTab({
  blogTitle,
  blogSlug, setBlogSlug,
  blogKeywords, setBlogKeywords,
  blogExcerpt, setBlogExcerpt,
  blogImage, setBlogImage,
  handleFeaturedImageUpload, uploadingFeaturedImage,
  blogContent, setBlogContent,
  blogCategories, setBlogCategories,
  blogAuthorId, setBlogAuthorId,
  blogStatus, setBlogStatus,
  instagramAutoPost, setInstagramAutoPost,
  instagramCaption, setInstagramCaption,
  editingBlogId,
  categories, authors,
  savedDraft, hasDraftContent,
  restoreDraft, discardDraft, formatDraftTime,
  handleBlogSubmit, handleTitleChange, onCancel,
}: BlogFormTabProps) {
  const [confirmDeleteImage, setConfirmDeleteImage] = useState(false)

  return (
    <div className="space-y-4">
      {/* Draft restore banner */}
      {savedDraft && !hasDraftContent() && (
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Unsaved draft found</p>
              <p className="text-xs text-amber-600/70 dark:text-amber-500/70">
                Last saved at {formatDraftTime(savedDraft.savedAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              className="h-8 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold border-0"
              onClick={restoreDraft}
            >
              Restore
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-3 rounded-xl text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
              onClick={discardDraft}
            >
              Discard
            </Button>
          </div>
        </div>
      )}

      <Card className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl overflow-hidden rounded-2xl sm:rounded-[2rem]">
        <form onSubmit={handleBlogSubmit}>
          <CardHeader className="border-b border-border/40 bg-white/30 dark:bg-black/20 pb-4 sm:pb-6 pt-4 sm:pt-6 px-4 sm:px-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-orange-500/10 rounded-xl sm:rounded-2xl border border-orange-500/20 shrink-0">
                {editingBlogId
                  ? <Edit className="w-5 h-5 sm:w-7 sm:h-7 text-orange-600" />
                  : <PlusCircle className="w-5 h-5 sm:w-7 sm:h-7 text-orange-600 dark:text-orange-400" />}
              </div>
              <div className="flex-1 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                <div>
                  <CardTitle className="text-xl sm:text-2xl font-bold">
                    {editingBlogId ? "Edit Blog Post" : "Create New Blog Post"}
                  </CardTitle>
                  <CardDescription className="mt-0.5 text-xs sm:text-sm">
                    {editingBlogId
                      ? "Update your article details and save changes."
                      : "Draft a new article. Select a category and set its publishing status."}
                  </CardDescription>
                </div>
                {savedDraft && hasDraftContent() && !editingBlogId && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 font-semibold shrink-0 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Autosaved {formatDraftTime(savedDraft.savedAt)}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* ── Main content column ── */}
              <div className="lg:col-span-8 space-y-7">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-semibold flex items-center justify-between">
                    Post Title
                    <span className="text-[10px] uppercase font-bold tracking-wider text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">Required</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="e.g. 10 Essential Tips for Puppy Training..."
                    value={blogTitle}
                    onChange={handleTitleChange}
                    className="h-13 text-base bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 focus-visible:ring-orange-500/30 focus-visible:border-orange-500 rounded-xl px-4"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="slug" className="text-sm font-semibold">URL Slug</Label>
                    <Input
                      id="slug"
                      placeholder="url-friendly-slug"
                      value={blogSlug}
                      onChange={(e) => setBlogSlug(e.target.value)}
                      className="h-11 bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 focus-visible:ring-orange-500/30 focus-visible:border-orange-500 rounded-xl px-4 font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="image" className="text-sm font-semibold">Featured Image URL</Label>
                    <div className="space-y-2">
                      <Input
                        id="image"
                        placeholder="https://images.unsplash.com/..."
                        value={blogImage}
                        onChange={(e) => setBlogImage(e.target.value)}
                        className="h-11 bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 focus-visible:ring-orange-500/30 focus-visible:border-orange-500 rounded-xl px-4"
                      />
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-orange-600 bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2 cursor-pointer hover:bg-orange-500/15 transition-colors">
                        <UploadCloud className="w-3.5 h-3.5" />
                        {uploadingFeaturedImage ? "Uploading & compressing..." : "Upload image (auto-compress)"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingFeaturedImage}
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file) await handleFeaturedImageUpload(file)
                            e.currentTarget.value = ""
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="keywords" className="text-sm font-semibold">Keywords (SEO)</Label>
                    <Input
                      id="keywords"
                      placeholder="pets, puppy, tips..."
                      value={blogKeywords}
                      onChange={(e) => setBlogKeywords(e.target.value)}
                      className="h-11 bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 focus-visible:ring-orange-500/30 focus-visible:border-orange-500 rounded-xl px-4"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="excerpt" className="text-sm font-semibold">Excerpt / Summary</Label>
                  <Textarea
                    id="excerpt"
                    placeholder="A short summary for the blog list page..."
                    className="min-h-[90px] resize-y bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 focus-visible:ring-orange-500/30 focus-visible:border-orange-500 rounded-xl p-4"
                    value={blogExcerpt}
                    onChange={(e) => setBlogExcerpt(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center justify-between">
                    Content Body
                    <span className="text-[10px] uppercase font-bold tracking-wider text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">Required</span>
                  </Label>
                  <Editor
                    value={blogContent}
                    onChange={setBlogContent}
                    placeholder="Write your blog post here..."
                  />
                </div>
              </div>

              {/* ── Sidebar publish panel ── */}
              <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8 self-start">
                <div className="rounded-2xl border border-white/50 dark:border-white/10 bg-white/40 dark:bg-black/40 p-6 backdrop-blur-xl shadow-xl space-y-6">
                  <h3 className="font-bold text-base border-b border-border/40 pb-4 flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-orange-500" />
                    Publish Settings
                  </h3>

                  {/* Category picker */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center justify-between">
                      Categories
                      <span className="text-[10px] uppercase font-bold tracking-wider text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">Req · multi</span>
                    </Label>
                    {blogCategories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {blogCategories.map(id => {
                          const cat = categories.find(c => c.id === id)
                          return cat ? (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-500/10 text-orange-700 border border-orange-500/20"
                            >
                              {cat.parentId ? <ChevronRight className="w-2.5 h-2.5" /> : null}
                              {cat.name}
                              <button
                                type="button"
                                onClick={() => setBlogCategories(prev => prev.filter(x => x !== id))}
                                className="ml-0.5 hover:text-red-500 transition-colors"
                              >×</button>
                            </span>
                          ) : null
                        })}
                      </div>
                    )}
                    <div className="rounded-xl border border-white/30 dark:border-white/10 bg-white/40 dark:bg-black/30 divide-y divide-border/30 overflow-hidden max-h-[200px] overflow-y-auto">
                      {categories.filter(c => !c.parentId).map(cat => {
                        const subs = categories.filter(s => s.parentId === cat.id)
                        const checked = blogCategories.includes(cat.id)
                        return (
                          <div key={cat.id}>
                            <label className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-orange-500/5 transition-colors ${checked ? "bg-orange-500/5" : ""}`}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setBlogCategories(prev => prev.includes(cat.id) ? prev : [...prev, cat.id])
                                  } else {
                                    setBlogCategories(prev => prev.filter(x => x !== cat.id))
                                  }
                                }}
                                className="w-3.5 h-3.5 accent-orange-500 rounded"
                              />
                              <span className="text-sm font-semibold">{cat.name}</span>
                              {checked && <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 ml-auto" />}
                            </label>
                            {subs.map(sub => {
                              const subChecked = blogCategories.includes(sub.id)
                              return (
                                <label
                                  key={sub.id}
                                  className={`flex items-center gap-2.5 pl-7 pr-3 py-2 cursor-pointer hover:bg-orange-500/5 transition-colors ${subChecked ? "bg-orange-500/5" : ""}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={subChecked}
                                    onChange={e => {
                                      if (e.target.checked) {
                                        setBlogCategories(prev => prev.includes(sub.id) ? prev : [...prev, sub.id])
                                      } else {
                                        setBlogCategories(prev => prev.filter(x => x !== sub.id))
                                      }
                                    }}
                                    className="w-3 h-3 accent-orange-400 rounded"
                                  />
                                  <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
                                  <span className="text-xs font-medium text-muted-foreground">{sub.name}</span>
                                  {subChecked && <CheckCircle2 className="w-3 h-3 text-orange-400 ml-auto" />}
                                </label>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                    {blogCategories.length === 0 && (
                      <p className="text-[11px] text-orange-500 font-medium flex items-center gap-1">
                        <CircleDashed className="w-3 h-3" /> Select at least one category
                      </p>
                    )}
                  </div>

                  {/* Author */}
                  <div className="space-y-2 pt-4 border-t border-border/40">
                    <Label className="text-sm font-semibold flex items-center justify-between">
                      Author
                      <span className="text-[10px] uppercase font-bold tracking-wider text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">Req</span>
                    </Label>
                    <Select value={blogAuthorId} onValueChange={setBlogAuthorId}>
                      <SelectTrigger className="h-11 bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 rounded-xl focus:ring-orange-500/30">
                        <SelectValue placeholder="Select an author" />
                      </SelectTrigger>
                      <SelectContent className="backdrop-blur-2xl bg-white/80 dark:bg-black/80 rounded-xl border border-white/20 dark:border-white/10">
                        {authors.map((admin) => (
                          <SelectItem key={admin.id} value={admin.id} className="rounded-lg my-1 cursor-pointer">
                            {admin.displayName || admin.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status */}
                  <div className="space-y-2 pt-4 border-t border-border/40">
                    <Label className="text-sm font-semibold">Visibility</Label>
                    <Select value={blogStatus} onValueChange={(val: "published" | "draft") => setBlogStatus(val)}>
                      <SelectTrigger className="h-11 bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 rounded-xl focus:ring-orange-500/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="backdrop-blur-2xl bg-white/80 dark:bg-black/80 rounded-xl border border-white/20 dark:border-white/10">
                        <SelectItem value="draft" className="rounded-lg my-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <CircleDashed className="w-4 h-4 text-orange-500" />
                            <span className="font-medium">Draft (Hidden)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="published" className="rounded-lg my-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="font-medium">Published (Public)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Instagram publish POC */}
                  <div className="space-y-2 pt-4 border-t border-border/40">
                    <Label className="text-sm font-semibold flex items-center justify-between">
                      Instagram Sync (POC)
                      <span className="text-xs text-muted-foreground font-normal">Optional</span>
                    </Label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={instagramAutoPost}
                        onChange={(e) => setInstagramAutoPost(e.target.checked)}
                        className="w-4 h-4 accent-orange-500 rounded"
                      />
                      Auto publish to Instagram when visibility is set to Published
                    </label>
                    <Textarea
                      placeholder="Instagram caption / description"
                      value={instagramCaption}
                      onChange={(e) => setInstagramCaption(e.target.value)}
                      className="min-h-[88px] text-sm bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 focus-visible:ring-orange-500/30 focus-visible:border-orange-500 rounded-xl p-3"
                    />
                    <div className="text-[11px] text-muted-foreground space-y-1">
                      <p>Uses the featured image URL as the Instagram image.</p>
                      <p>If API credentials are missing or Instagram rejects the post, blog publishing still succeeds.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 border-t border-border/40 bg-white/20 dark:bg-black/20 p-4 sm:p-6">
            <Button
              type="button"
              variant="outline"
              className="h-10 sm:h-11 px-5 sm:px-7 rounded-xl bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/20 font-semibold w-full sm:w-auto"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-10 sm:h-11 px-6 sm:px-9 gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xl shadow-orange-500/20 font-bold border-0 w-full sm:w-auto"
            >
              <Save className="w-4 h-4" />
              {editingBlogId
                ? "Update Article"
                : `Save ${blogStatus === "draft" ? "Draft" : "Post"}`}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <AlertDialog open={confirmDeleteImage} onOpenChange={setConfirmDeleteImage}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove featured image?</AlertDialogTitle>
            <AlertDialogDescription>
              This only removes it from the blog form. The uploaded file remains in storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setBlogImage("")
                setConfirmDeleteImage(false)
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
