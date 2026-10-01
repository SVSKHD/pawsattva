"use client"

import {
  PlusCircle, Edit, Save, CheckCircle2, CircleDashed, Trash2,
  ChevronRight, UploadCloud, History, Sparkles, Settings2, Search, ImageIcon, AlertTriangle,
} from "lucide-react"
import { imageUrlProblem } from "@/lib/image-hosts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  blogSeoTitle: string
  setBlogSeoTitle: (v: string) => void
  blogSeoDescription: string
  setBlogSeoDescription: (v: string) => void
  blogSeoKeywords: string
  setBlogSeoKeywords: (v: string) => void
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
  isSavingBlog: boolean
  handleTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onLoadSoftWaterPetsTemplate: () => void
  onCancel: () => void
}

const fieldClass = "bg-white/60 dark:bg-black/40 border-black/10 dark:border-white/10 focus-visible:ring-orange-500/30 focus-visible:border-orange-500 rounded-xl"

/**
 * One-screen blog workspace: title + fixed-height editor on the left,
 * every other field in a tabbed side panel (Publish · SEO · Media) on the right.
 */
export function BlogFormTab({
  blogTitle,
  blogSlug, setBlogSlug,
  blogKeywords, setBlogKeywords,
  blogExcerpt, setBlogExcerpt,
  blogSeoTitle, setBlogSeoTitle,
  blogSeoDescription, setBlogSeoDescription,
  blogSeoKeywords, setBlogSeoKeywords,
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
  handleBlogSubmit, isSavingBlog, handleTitleChange, onLoadSoftWaterPetsTemplate, onCancel,
}: BlogFormTabProps) {
  const [confirmDeleteImage, setConfirmDeleteImage] = useState(false)
  const [panel, setPanel] = useState("publish")

  const publishMissing = (blogCategories.length === 0 ? 1 : 0) + (blogAuthorId ? 0 : 1)
  const imageProblem = imageUrlProblem(blogImage)
  const seoMissing =[blogExcerpt, blogSeoTitle, blogSeoDescription].filter((v) => !v.trim()).length

  return (
    <div className="space-y-3">
      {/* Draft restore banner */}
      {savedDraft && !hasDraftContent() && (
        <div className="flex items-center justify-between gap-4 px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/25">
          <div className="flex items-center gap-2.5">
            <History className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Unsaved draft from {formatDraftTime(savedDraft.savedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button type="button" size="sm" className="h-8 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold border-0" onClick={restoreDraft}>
              Restore
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 rounded-xl text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-500/10" onClick={discardDraft}>
              Discard
            </Button>
          </div>
        </div>
      )}

      <form
        onSubmit={handleBlogSubmit}
        className="flex flex-col overflow-hidden rounded-2xl sm:rounded-[1.75rem] border border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl xl:h-[calc(100dvh-11rem)] xl:min-h-[620px]"
      >
        {/* ── Action bar: always visible ── */}
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border/40 bg-white/30 dark:bg-black/20 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="p-2 bg-orange-500/10 rounded-xl border border-orange-500/20 shrink-0">
              {editingBlogId
                ? <Edit className="w-4 h-4 text-orange-600" />
                : <PlusCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />}
            </div>
            <h2 className="truncate text-base sm:text-lg font-bold">
              {editingBlogId ? "Edit Blog Post" : "New Blog Post"}
            </h2>
            {savedDraft && hasDraftContent() && (
              <span className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-semibold">
                <CheckCircle2 className="w-3 h-3" />
                Autosaved {formatDraftTime(savedDraft.savedAt)}
              </span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {!editingBlogId && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onLoadSoftWaterPetsTemplate}
                title="Prefill the Soft Water & Pets article"
                className="h-9 rounded-xl text-cyan-800 hover:bg-cyan-50 dark:text-cyan-300 dark:hover:bg-cyan-500/10"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Soft-water template</span>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSavingBlog}
              className="h-9 px-4 rounded-xl bg-white/50 dark:bg-black/50 font-semibold"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSavingBlog}
              className="h-9 px-5 gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/20 font-bold border-0"
            >
              {isSavingBlog ? <CircleDashed className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSavingBlog
                ? "Saving..."
                : editingBlogId
                  ? "Update"
                  : `Save ${blogStatus === "draft" ? "Draft" : "Post"}`}
            </Button>
          </div>
        </div>

        {/* ── Workspace ── */}
        <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* Left: title, slug, editor */}
          <div className="flex min-h-0 flex-col gap-3 p-4 sm:p-5">
            <div className="shrink-0 space-y-1.5">
              <Input
                id="title"
                aria-label="Post title"
                placeholder="Post title — e.g. 10 Essential Tips for Puppy Training"
                value={blogTitle}
                onChange={handleTitleChange}
                className={`h-12 text-lg font-semibold px-4 ${fieldClass}`}
              />
              <div className="flex items-center gap-2 px-1">
                <Label htmlFor="slug" className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">/blog/</Label>
                <input
                  id="slug"
                  placeholder="url-friendly-slug"
                  value={blogSlug}
                  onChange={(e) => setBlogSlug(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent font-mono text-xs text-foreground/80 outline-none border-b border-dashed border-transparent focus:border-orange-400"
                />
              </div>
            </div>

            <Editor
              value={blogContent}
              onChange={setBlogContent}
              placeholder="Write your blog post here..."
              className="h-[65vh] min-h-[420px] xl:h-auto xl:min-h-0 xl:flex-1"
            />
          </div>

          {/* Right: tabbed settings panel */}
          <Tabs
            value={panel}
            onValueChange={setPanel}
            className="flex min-h-0 flex-col gap-0 border-t xl:border-t-0 xl:border-l border-border/40 bg-white/25 dark:bg-black/20"
          >
            <div className="shrink-0 p-3 pb-0">
              <TabsList className="w-full">
                <PanelTab value="publish" icon={Settings2} label="Publish" missing={publishMissing} />
                <PanelTab value="seo" icon={Search} label="SEO" missing={seoMissing} />
                <PanelTab value="media" icon={ImageIcon} label="Media" missing={blogImage.trim() && !imageProblem ? 0 : 1} />
              </TabsList>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {/* Publish */}
              <TabsContent value="publish" className="mt-0 space-y-5">
                <div className="space-y-2">
                  <FieldLabel required="Req · multi">Categories</FieldLabel>
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
                  <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/30 divide-y divide-border/30 overflow-hidden max-h-[220px] overflow-y-auto">
                    {categories.filter(c => !c.parentId).map(cat => {
                      const subs = categories.filter(s => s.parentId === cat.id)
                      const checked = blogCategories.includes(cat.id)
                      return (
                        <div key={cat.id}>
                          <label className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-orange-500/5 transition-colors ${checked ? "bg-orange-500/5" : ""}`}>
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
                                className={`flex items-center gap-2.5 pl-7 pr-3 py-1.5 cursor-pointer hover:bg-orange-500/5 transition-colors ${subChecked ? "bg-orange-500/5" : ""}`}
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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="space-y-2">
                    <FieldLabel required="Req">Author</FieldLabel>
                    <Select value={blogAuthorId} onValueChange={setBlogAuthorId}>
                      <SelectTrigger className={`h-10 w-full ${fieldClass}`}>
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

                  <div className="space-y-2">
                    <FieldLabel>Visibility</FieldLabel>
                    <Select value={blogStatus} onValueChange={(val: "published" | "draft") => setBlogStatus(val)}>
                      <SelectTrigger className={`h-10 w-full ${fieldClass}`}>
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
                </div>

                <div className="space-y-2 pt-4 border-t border-border/40">
                  <FieldLabel hint="Optional">Instagram Sync (POC)</FieldLabel>
                  <label className="flex items-start gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={instagramAutoPost}
                      onChange={(e) => setInstagramAutoPost(e.target.checked)}
                      className="mt-0.5 w-3.5 h-3.5 accent-orange-500 rounded"
                    />
                    Auto publish to Instagram when visibility is Published
                  </label>
                  {instagramAutoPost && (
                    <>
                      <Textarea
                        placeholder="Instagram caption / description"
                        value={instagramCaption}
                        onChange={(e) => setInstagramCaption(e.target.value)}
                        className={`min-h-[80px] text-sm p-3 ${fieldClass}`}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Uses the featured image. If Instagram rejects the post, blog publishing still succeeds.
                      </p>
                    </>
                  )}
                </div>
              </TabsContent>

              {/* SEO */}
              <TabsContent value="seo" className="mt-0 space-y-4">
                <GooglePreview
                  title={blogSeoTitle.trim() || blogTitle.trim()}
                  description={blogSeoDescription.trim() || blogExcerpt.trim()}
                  slug={blogSlug.trim()}
                />
                <div className="space-y-2">
                  <FieldLabel htmlFor="excerpt" count={`${blogExcerpt.trim().length}`}>Excerpt / Summary</FieldLabel>
                  <Textarea
                    id="excerpt"
                    placeholder="A short summary for the blog list page..."
                    className={`min-h-[80px] resize-y p-3 text-sm ${fieldClass}`}
                    value={blogExcerpt}
                    onChange={(e) => setBlogExcerpt(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="keywords">Keywords</FieldLabel>
                  <Input
                    id="keywords"
                    placeholder="pets, puppy, tips..."
                    value={blogKeywords}
                    onChange={(e) => setBlogKeywords(e.target.value)}
                    className={`h-10 px-3 text-sm ${fieldClass}`}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="seo-title" count={`${blogSeoTitle.trim().length}/60`}>SEO Title</FieldLabel>
                  <Input
                    id="seo-title"
                    placeholder="Search-friendly title..."
                    value={blogSeoTitle}
                    onChange={(e) => setBlogSeoTitle(e.target.value)}
                    maxLength={70}
                    className={`h-10 px-3 text-sm ${fieldClass}`}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="seo-description" count={`${blogSeoDescription.trim().length}/160`}>SEO Description</FieldLabel>
                  <Textarea
                    id="seo-description"
                    placeholder="Human-written meta description, ideally 120–160 characters..."
                    value={blogSeoDescription}
                    onChange={(e) => setBlogSeoDescription(e.target.value)}
                    maxLength={180}
                    className={`min-h-[88px] resize-y p-3 text-sm ${fieldClass}`}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="seo-keywords">SEO Keywords / Keyphrases</FieldLabel>
                  <Textarea
                    id="seo-keywords"
                    placeholder="hard water and pets, soft water for dogs..."
                    value={blogSeoKeywords}
                    onChange={(e) => setBlogSeoKeywords(e.target.value)}
                    className={`min-h-[72px] resize-y p-3 text-sm ${fieldClass}`}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Saved with the post; refine later in the SEO Command Center.
                </p>
              </TabsContent>

              {/* Media */}
              <TabsContent value="media" className="mt-0 space-y-3">
                <FieldLabel htmlFor="image">Featured Image</FieldLabel>
                {imageProblem && (
                  <p role="alert" className="flex items-start gap-1.5 rounded-xl border border-red-300/60 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                    <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                    {imageProblem}
                  </p>
                )}
                {blogImage.trim() && !imageProblem ? (
                  <div className="group relative overflow-hidden rounded-xl border border-black/10 dark:border-white/10 bg-muted/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={blogImage} alt="Featured image preview" className="aspect-video w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteImage(true)}
                      aria-label="Remove featured image"
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white transition hover:bg-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-black/15 dark:border-white/15 text-xs text-muted-foreground">
                    No featured image yet
                  </div>
                )}
                <Input
                  id="image"
                  placeholder="https://images.unsplash.com/..."
                  value={blogImage}
                  onChange={(e) => setBlogImage(e.target.value)}
                  className={`h-10 px-3 text-sm ${fieldClass}`}
                />
                <label className="flex w-full items-center justify-center gap-2 text-xs font-semibold text-orange-600 bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-orange-500/15 transition-colors">
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
                <p className="text-[11px] text-muted-foreground">Shown in the article hero, blog cards and social shares.</p>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </form>

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

const SITE_HOST = "pawsattva.com"

/** Approximates a Google result; Google cuts titles near 60 chars and descriptions near 160 */
function GooglePreview({ title, description, slug }: { title: string; description: string; slug: string }) {
  const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text)

  return (
    <div className="rounded-xl border border-black/10 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-zinc-950">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Google preview</p>
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-black text-orange-600 dark:bg-orange-500/20">P</span>
        <div className="min-w-0 leading-tight">
          <p className="text-xs text-slate-800 dark:text-slate-200">PawSattva</p>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
            https://{SITE_HOST} › blog › {slug || "your-post-slug"}
          </p>
        </div>
      </div>
      <p className={`mt-1.5 text-[17px] leading-snug ${title ? "text-[#1a0dab] dark:text-[#8ab4f8]" : "text-slate-400"}`}>
        {title ? clip(title, 60) : "SEO title preview"}
      </p>
      <p className={`mt-0.5 text-xs leading-relaxed ${description ? "text-slate-600 dark:text-slate-400" : "text-slate-400"}`}>
        {description ? clip(description, 160) : "Meta description preview — add an SEO description or excerpt."}
      </p>
    </div>
  )
}

function PanelTab({ value, icon: Icon, label, missing }: { value: string; icon: typeof Settings2; label: string; missing: number }) {
  return (
    <TabsTrigger value={value} className="gap-1.5 text-xs">
      <Icon className="h-3.5 w-3.5" />
      {label}
      {missing > 0 && (
        <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
          {missing}
        </span>
      )}
    </TabsTrigger>
  )
}

function FieldLabel({
  children, htmlFor, required, hint, count,
}: { children: React.ReactNode; htmlFor?: string; required?: string; hint?: string; count?: string }) {
  return (
    <Label htmlFor={htmlFor} className="flex items-center justify-between text-xs font-semibold">
      {children}
      {required && (
        <span className="text-[10px] uppercase font-bold tracking-wider text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">{required}</span>
      )}
      {hint && <span className="text-[11px] font-normal text-muted-foreground">{hint}</span>}
      {count && <span className="text-[11px] font-medium tabular-nums text-muted-foreground">{count}</span>}
    </Label>
  )
}
