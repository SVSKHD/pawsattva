"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { formatDistanceToNow } from "date-fns"
import {
  AlertTriangle, CheckCircle2, Code2, ExternalLink, Eye, History, ImageIcon, Loader2,
  PenLine, RotateCcw, Rocket, Search, ShieldCheck, Upload, XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  AiDraftApiError, editAiDraft, onAiDraftAuditSnapshot, runAiDraftAction, type AiDraftEditInput,
} from "@/firebase/ai-drafts"
import { getAdminUsers, type Category, type UserProfile } from "@/firebase/firestore"
import { publishBlockers } from "@/lib/ai-drafts/readiness"
import {
  AI_DRAFT_ACTIONS_REQUIRING_NOTE, AI_DRAFT_EDITABLE_STATUSES, AI_DRAFT_LIMITS, AI_DRAFT_STATUS_LABEL,
  canTransition, slugify, type AiBlogDraft, type AiDraftAction, type AiDraftAuditEntry, type ImageAttribution,
} from "@/lib/ai-drafts/types"
import { ImageCredit } from "@/components/image-credit"
import { imageUrlProblem } from "@/lib/image-hosts"
import { cn } from "@/lib/utils"
import { AiDraftStatusBadge, toDate } from "./AiDraftStatus"

const Editor = dynamic(() => import("@/components/editor"), {
  ssr: false,
  loading: () => <Skeleton className="h-[480px] w-full rounded-2xl" />,
})

// ── Form model ───────────────────────────────────────────────────────────────

type AttributionForm = Required<Omit<ImageAttribution, "attributionRequired">> & { attributionRequired: boolean }

interface DraftForm {
  title: string
  slug: string
  excerpt: string
  keywords: string
  seoTitle: string
  seoDescription: string
  image: string
  content: string
  categoryIds: string[]
  authorId: string
  attribution: AttributionForm
  imageRightsConfirmed: boolean
}

const toForm = (draft: AiBlogDraft): DraftForm => ({
  title: draft.title ?? "",
  slug: draft.slug ?? "",
  excerpt: draft.excerpt ?? "",
  keywords: (draft.keywords ?? []).join(", "),
  seoTitle: draft.seoTitle ?? "",
  seoDescription: draft.seoDescription ?? "",
  image: draft.image ?? "",
  content: draft.content ?? "",
  categoryIds: draft.categoryIds ?? [],
  authorId: draft.authorId ?? "",
  attribution: {
    sourceUrl: draft.imageAttribution?.sourceUrl ?? "",
    creator: draft.imageAttribution?.creator ?? "",
    license: draft.imageAttribution?.license ?? "",
    licenseUrl: draft.imageAttribution?.licenseUrl ?? "",
    attributionText: draft.imageAttribution?.attributionText ?? "",
    altText: draft.imageAttribution?.altText ?? "",
    attributionRequired: Boolean(draft.imageAttribution?.attributionRequired),
  },
  imageRightsConfirmed: Boolean(draft.imageRightsConfirmed),
})

const attributionFromForm = (form: AttributionForm): ImageAttribution | null => {
  const result: ImageAttribution = {}
  for (const key of ["sourceUrl", "creator", "license", "licenseUrl", "attributionText", "altText"] as const) {
    const value = form[key].trim()
    if (value) result[key] = value
  }
  if (form.attributionRequired) result.attributionRequired = true
  return Object.keys(result).length ? result : null
}

const splitKeywords = (value: string) => value.split(",").map((keyword) => keyword.trim()).filter(Boolean)

/** Only the fields the moderator actually changed, in the API's shape. */
function changesFrom(form: DraftForm, draft: AiBlogDraft): AiDraftEditInput {
  const base = toForm(draft)
  const changes: AiDraftEditInput = {}
  const text = ["title", "slug", "excerpt", "seoTitle", "seoDescription", "image", "content", "authorId"] as const
  for (const key of text) if (form[key] !== base[key]) changes[key] = form[key]
  if (form.keywords !== base.keywords) changes.keywords = splitKeywords(form.keywords)
  if (JSON.stringify(form.categoryIds) !== JSON.stringify(base.categoryIds)) changes.categoryIds = form.categoryIds
  if (JSON.stringify(form.attribution) !== JSON.stringify(base.attribution)) changes.imageAttribution = attributionFromForm(form.attribution)
  if (form.imageRightsConfirmed !== base.imageRightsConfirmed) changes.imageRightsConfirmed = form.imageRightsConfirmed
  return changes
}

// ── Actions ──────────────────────────────────────────────────────────────────

const ACTIONS: Record<AiDraftAction, {
  label: string
  icon: typeof CheckCircle2
  className: string
  confirmTitle: string
  confirmBody: string
}> = {
  start_review: {
    label: "Start review", icon: Eye, className: "bg-sky-600 hover:bg-sky-700 text-white",
    confirmTitle: "Start reviewing this draft?", confirmBody: "Other admins will see it as In review.",
  },
  approve: {
    label: "Approve", icon: CheckCircle2, className: "bg-emerald-600 hover:bg-emerald-700 text-white",
    confirmTitle: "Approve this article?", confirmBody: "Approval does not publish it. Editing the content later will withdraw the approval.",
  },
  request_changes: {
    label: "Request changes", icon: PenLine, className: "bg-orange-500 hover:bg-orange-600 text-white",
    confirmTitle: "Request changes?", confirmBody: "Describe what needs to change. The note is saved in the audit history.",
  },
  reject: {
    label: "Reject", icon: XCircle, className: "bg-destructive hover:bg-destructive/90 text-white",
    confirmTitle: "Reject this draft?", confirmBody: "Rejected drafts are kept for the record but can't be edited or published unless reopened.",
  },
  reopen: {
    label: "Reopen", icon: RotateCcw, className: "bg-sky-600 hover:bg-sky-700 text-white",
    confirmTitle: "Reopen for review?", confirmBody: "The draft moves back to In review.",
  },
  publish: {
    label: "Publish", icon: Rocket, className: "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white",
    confirmTitle: "Publish to pawsattva.com?", confirmBody: "This creates a public blog post that appears on the site, the blog index and the sitemap.",
  },
}

const ACTION_ORDER: AiDraftAction[] = ["start_review", "reopen", "request_changes", "reject", "approve", "publish"]

const PIPELINE = ["draft", "in_review", "approved", "published"] as const

// ── Component ────────────────────────────────────────────────────────────────

interface AiDraftReviewProps {
  draft: AiBlogDraft | null
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
}

export function AiDraftReview({ draft, open, onOpenChange, categories }: AiDraftReviewProps) {
  const [form, setForm] = useState<DraftForm | null>(null)
  const [tab, setTab] = useState("preview")
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [pendingAction, setPendingAction] = useState<AiDraftAction | null>(null)
  const [actionNote, setActionNote] = useState("")
  const [runningAction, setRunningAction] = useState(false)
  const [authors, setAuthors] = useState<UserProfile[]>([])
  const [audit, setAudit] = useState<AiDraftAuditEntry[] | null>(null)
  const [htmlMode, setHtmlMode] = useState(false)
  const [uploading, setUploading] = useState(false)
  const loadedKey = useRef("")

  const changes = useMemo(() => (form && draft ? changesFrom(form, draft) : {}), [form, draft])
  const dirty = Object.keys(changes).length > 0
  const editable = draft ? AI_DRAFT_EDITABLE_STATUSES.includes(draft.status) : false

  // Load the form when a draft opens, and refresh it on remote updates unless there are unsaved edits.
  // Closing the panel discards unsaved edits, so reopening always starts from the stored draft.
  useEffect(() => {
    if (!open) {
      loadedKey.current = ""
      return
    }
    if (!draft) return
    const key = `${draft.id}:${draft.revision ?? 0}`
    if (loadedKey.current === key) return
    const switchedDraft = !loadedKey.current.startsWith(`${draft.id}:`)
    if (!switchedDraft && dirty) return
    loadedKey.current = key
    setForm(toForm(draft))
    setFieldErrors({})
    if (switchedDraft) {
      setTab("preview")
      setHtmlMode(/<table[\s>]/i.test(draft.content ?? ""))
    }
  }, [open, draft, dirty])

  useEffect(() => {
    if (!open || authors.length) return
    getAdminUsers().then(setAuthors).catch(() => toast.error("Failed to load authors."))
  }, [open, authors.length])

  const draftId = draft?.id
  useEffect(() => {
    if (!open || !draftId) return
    setAudit(null)
    return onAiDraftAuditSnapshot(draftId, setAudit, () => {
      setAudit([])
      toast.error("Failed to load the audit history.")
    })
  }, [open, draftId])

  if (!draft || !form) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-3xl">
          <SheetHeader><SheetTitle>Loading draft…</SheetTitle></SheetHeader>
          <div className="space-y-3 p-4"><Skeleton className="h-48 w-full" /><Skeleton className="h-6 w-2/3" /><Skeleton className="h-40 w-full" /></div>
        </SheetContent>
      </Sheet>
    )
  }

  const update = <K extends keyof DraftForm>(key: K, value: DraftForm[K]) => setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  const updateAttribution = <K extends keyof AttributionForm>(key: K, value: AttributionForm[K]) =>
    setForm((prev) => (prev ? { ...prev, attribution: { ...prev.attribution, [key]: value } } : prev))

  const previewDraft = {
    ...draft,
    ...form,
    keywords: splitKeywords(form.keywords),
    imageAttribution: attributionFromForm(form.attribution) ?? undefined,
  }
  const blockers = publishBlockers(previewDraft)
  const imageProblem = form.image ? imageUrlProblem(form.image) : null
  const availableActions = ACTION_ORDER.filter((action) => canTransition(draft.status, action))

  const save = async () => {
    if (!dirty) return
    setSaving(true)
    setFieldErrors({})
    try {
      const result = await editAiDraft(draft.id, draft.revision ?? 0, changes)
      toast.success(result.status !== draft.status ? "Saved. The approval was withdrawn because the content changed." : "Draft saved.")
      result.warnings?.forEach((warning) => toast.warning(warning))
    } catch (error) {
      if (error instanceof AiDraftApiError) {
        setFieldErrors(Object.fromEntries(error.details.map((detail) => [detail.field.split(/[.[]/)[0], detail.message])))
        toast.error(error.message)
      } else {
        toast.error("Failed to save the draft.")
      }
    } finally {
      setSaving(false)
    }
  }

  const runAction = async () => {
    if (!pendingAction) return
    setRunningAction(true)
    try {
      const result = await runAiDraftAction(draft.id, draft.revision ?? 0, pendingAction, actionNote)
      if (pendingAction === "publish" && result.url) {
        toast.success("Published!", { action: { label: "View post", onClick: () => window.open(result.url, "_blank", "noopener") } })
      } else {
        toast.success(`Draft marked ${AI_DRAFT_STATUS_LABEL[result.status as AiBlogDraft["status"]] ?? result.status}.`)
      }
      setPendingAction(null)
      setActionNote("")
    } catch (error) {
      const message = error instanceof AiDraftApiError
        ? [error.message, ...error.details.map((detail) => detail.message)].join(" ")
        : "The action failed."
      toast.error(message)
    } finally {
      setRunningAction(false)
    }
  }

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    try {
      const { uploadBlogImage } = await import("@/lib/image-upload")
      const result = await uploadBlogImage(file, { folder: "blog-featured-images", targetKB: 240 })
      update("image", result.url)
      toast.success("Image uploaded. Save the draft to keep it.")
    } catch {
      toast.error("Image upload failed.")
    } finally {
      setUploading(false)
    }
  }

  const noteRequired = pendingAction ? AI_DRAFT_ACTIONS_REQUIRING_NOTE.includes(pendingAction) : false

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl lg:max-w-4xl">
        {/* ── Header ── */}
        <SheetHeader className="border-b border-border/50 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <AiDraftStatusBadge status={draft.status} />
            <span className="text-xs text-muted-foreground">
              Submitted {toDate(draft.createdAt) ? formatDistanceToNow(toDate(draft.createdAt)!, { addSuffix: true }) : "recently"} by the AI integration
            </span>
          </div>
          <SheetTitle className="text-lg sm:text-xl font-bold leading-snug">{draft.title}</SheetTitle>
          <SheetDescription className="sr-only">Review, edit and moderate this AI-generated draft.</SheetDescription>
          <StatusPipeline status={draft.status} />
          {draft.moderation?.note && (draft.status === "changes_requested" || draft.status === "rejected") && (
            <p className="mt-2 rounded-xl border border-orange-500/20 bg-orange-500/5 px-3 py-2 text-xs text-orange-800 dark:text-orange-300">
              <span className="font-bold">Moderator note:</span> {draft.moderation.note}
            </p>
          )}
        </SheetHeader>

        {/* ── Body ── */}
        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="overflow-x-auto border-b border-border/50 px-3 pt-2 sm:px-5 [scrollbar-width:none]">
            <TabsList variant="line" className="h-10">
              <TabsTrigger value="preview"><Eye className="h-3.5 w-3.5" />Preview</TabsTrigger>
              <TabsTrigger value="edit"><PenLine className="h-3.5 w-3.5" />Edit</TabsTrigger>
              <TabsTrigger value="seo"><Search className="h-3.5 w-3.5" />SEO</TabsTrigger>
              <TabsTrigger value="image"><ImageIcon className="h-3.5 w-3.5" />Image & license</TabsTrigger>
              <TabsTrigger value="history"><History className="h-3.5 w-3.5" />History</TabsTrigger>
            </TabsList>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            {!editable && tab !== "preview" && tab !== "history" && (
              <p className="mb-4 rounded-xl bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
                {draft.status === "published" ? "This draft is published. Edit the live post from Blog Posts." : "Rejected drafts are read-only. Reopen it to make changes."}
              </p>
            )}

            {/* Preview */}
            <TabsContent value="preview" className="space-y-5">
              <DraftImage src={form.image} alt={form.attribution.altText || form.title} className="aspect-[16/9] w-full rounded-2xl" />
              <ImageCredit attribution={attributionFromForm(form.attribution)} />
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{form.title}</h1>
                <p className="mt-2 text-muted-foreground">{form.excerpt}</p>
              </div>
              {/* Content is sanitized on the server before it is stored. */}
              <article
                className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-orange-600 prose-img:rounded-xl"
                dangerouslySetInnerHTML={{ __html: form.content }}
              />
            </TabsContent>

            {/* Edit */}
            <TabsContent value="edit" className="space-y-4">
              <fieldset disabled={!editable} className="space-y-4">
                <Field label="Title" error={fieldErrors.title} count={[form.title.length, AI_DRAFT_LIMITS.title.max]}>
                  <Input value={form.title} onChange={(e) => update("title", e.target.value)} />
                </Field>
                <Field label="URL slug" error={fieldErrors.slug} hint={`pawsattva.com/blog/${form.slug || "…"}`}>
                  <div className="flex gap-2">
                    <Input value={form.slug} onChange={(e) => update("slug", e.target.value)} className="font-mono text-xs" />
                    <Button type="button" variant="outline" size="sm" className="h-9 shrink-0 rounded-lg" onClick={() => update("slug", slugify(form.title))}>
                      From title
                    </Button>
                  </div>
                </Field>
                <Field label="Excerpt" error={fieldErrors.excerpt} count={[form.excerpt.length, AI_DRAFT_LIMITS.excerpt.max]}>
                  <Textarea rows={3} value={form.excerpt} onChange={(e) => update("excerpt", e.target.value)} />
                </Field>
                <Field label="Keywords" error={fieldErrors.keywords} hint="Comma separated">
                  <Input value={form.keywords} onChange={(e) => update("keywords", e.target.value)} />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Categories" error={fieldErrors.categoryIds}>
                    <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-border/60 p-2">
                      {categories.length === 0 && <span className="text-xs text-muted-foreground">No categories yet.</span>}
                      {categories.map((category) => {
                        const selected = form.categoryIds.includes(category.id)
                        return (
                          <button
                            key={category.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => update("categoryIds", selected ? form.categoryIds.filter((id) => id !== category.id) : [...form.categoryIds, category.id])}
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-xs font-semibold transition",
                              selected ? "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300" : "border-border/60 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {category.parentId ? "↳ " : ""}{category.name}
                          </button>
                        )
                      })}
                    </div>
                  </Field>
                  <Field label="Author" error={fieldErrors.authorId}>
                    <NativeSelect value={form.authorId} onChange={(e) => update("authorId", e.target.value)} className="w-full">
                      <NativeSelectOption value="">Choose an author…</NativeSelectOption>
                      {authors.map((author) => (
                        <NativeSelectOption key={author.id} value={author.id}>{author.displayName || author.email}</NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                </div>

                <Field label="Article" error={fieldErrors.content}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground">
                      {htmlMode ? "Editing raw HTML. Unsafe markup is rejected when you save." : "The visual editor doesn't support tables; switch to HTML for those."}
                    </p>
                    <Button type="button" variant="outline" size="sm" className="h-7 rounded-lg text-xs" onClick={() => setHtmlMode((value) => !value)}>
                      {htmlMode ? <><PenLine className="h-3 w-3" />Visual</> : <><Code2 className="h-3 w-3" />HTML</>}
                    </Button>
                  </div>
                  {htmlMode ? (
                    <Textarea rows={22} value={form.content} onChange={(e) => update("content", e.target.value)} className="font-mono text-xs" />
                  ) : (
                    <Editor value={form.content} onChange={(value) => update("content", value)} className="h-[480px]" />
                  )}
                </Field>
              </fieldset>
            </TabsContent>

            {/* SEO */}
            <TabsContent value="seo" className="space-y-5">
              <div className="rounded-2xl border border-border/60 bg-white p-4 dark:bg-zinc-950">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Search result preview</p>
                <p className="mt-3 truncate text-xs text-emerald-700 dark:text-emerald-400">pawsattva.com › blog › {form.slug || "…"}</p>
                <p className="mt-0.5 line-clamp-1 text-lg text-[#1a0dab] dark:text-sky-400">{form.seoTitle || form.title}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{form.seoDescription || form.excerpt}</p>
              </div>
              <fieldset disabled={!editable} className="space-y-4">
                <Field label="SEO title" error={fieldErrors.seoTitle} count={[form.seoTitle.length, 60]} hint="Search engines show about 60 characters.">
                  <Input value={form.seoTitle} onChange={(e) => update("seoTitle", e.target.value)} />
                </Field>
                <Field label="Meta description" error={fieldErrors.seoDescription} count={[form.seoDescription.length, 160]} hint="Leave empty to use the excerpt.">
                  <Textarea rows={3} value={form.seoDescription} onChange={(e) => update("seoDescription", e.target.value)} />
                </Field>
              </fieldset>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {splitKeywords(form.keywords).map((keyword) => (
                    <span key={keyword} className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{keyword}</span>
                  ))}
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border/60">
                <p className="border-b border-border/60 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Social share preview</p>
                <DraftImage src={form.image} alt="" className="aspect-[1200/630] w-full" />
                <div className="bg-muted/40 px-4 py-3">
                  <p className="text-[11px] uppercase text-muted-foreground">pawsattva.com</p>
                  <p className="line-clamp-1 font-bold">{form.seoTitle || form.title}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{form.seoDescription || form.excerpt}</p>
                </div>
              </div>
            </TabsContent>

            {/* Image & license */}
            <TabsContent value="image" className="space-y-5">
              <DraftImage src={form.image} alt={form.attribution.altText} className="aspect-[16/9] w-full rounded-2xl" />
              {imageProblem && (
                <Callout tone="warn">
                  {imageProblem} Publishing is blocked until the image is uploaded to PawSattva or comes from an allowed host.
                </Callout>
              )}
              <fieldset disabled={!editable} className="space-y-4">
                <Field label="Featured image URL" error={fieldErrors.image}>
                  <div className="flex gap-2">
                    <Input value={form.image} onChange={(e) => update("image", e.target.value)} className="font-mono text-xs" />
                    <label className={cn("inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted", (!editable || uploading) && "pointer-events-none opacity-50")}>
                      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      Upload
                      <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleImageUpload(file); e.target.value = "" }} />
                    </label>
                  </div>
                </Field>
                <Field label="Alt text" error={fieldErrors.imageAttribution} hint="Describe the image for screen readers. Required to publish.">
                  <Input value={form.attribution.altText} onChange={(e) => updateAttribution("altText", e.target.value)} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Creator / photographer">
                    <Input value={form.attribution.creator} onChange={(e) => updateAttribution("creator", e.target.value)} />
                  </Field>
                  <Field label="License">
                    <Input value={form.attribution.license} placeholder="e.g. Unsplash License, CC BY 4.0" onChange={(e) => updateAttribution("license", e.target.value)} />
                  </Field>
                  <Field label="Original source page">
                    <Input value={form.attribution.sourceUrl} placeholder="https://" onChange={(e) => updateAttribution("sourceUrl", e.target.value)} />
                  </Field>
                  <Field label="License URL">
                    <Input value={form.attribution.licenseUrl} placeholder="https://" onChange={(e) => updateAttribution("licenseUrl", e.target.value)} />
                  </Field>
                </div>
                <Field label="Credit line" hint="Shown under the image on the published post.">
                  <Input value={form.attribution.attributionText} placeholder="Photo by … on …" onChange={(e) => updateAttribution("attributionText", e.target.value)} />
                </Field>
                <label className="flex items-start gap-2.5 text-sm">
                  <Checkbox checked={form.attribution.attributionRequired} onCheckedChange={(value) => updateAttribution("attributionRequired", value === true)} className="mt-0.5" />
                  <span>The license requires visible attribution</span>
                </label>
                <label className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
                  <Checkbox checked={form.imageRightsConfirmed} onCheckedChange={(value) => update("imageRightsConfirmed", value === true)} className="mt-0.5" />
                  <span>
                    <span className="flex items-center gap-1.5 font-semibold"><ShieldCheck className="h-4 w-4 text-emerald-600" />I checked the image license</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      PawSattva may use this image commercially, and the credit above meets the license terms. An image found online is not automatically free to reuse.
                    </span>
                  </span>
                </label>
              </fieldset>
            </TabsContent>

            {/* History */}
            <TabsContent value="history">
              <AuditHistory entries={audit} />
            </TabsContent>
          </div>
        </Tabs>

        {/* ── Footer: save + workflow ── */}
        <div className="space-y-3 border-t border-border/50 bg-background/95 p-3 backdrop-blur sm:p-4">
          {dirty && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Unsaved changes. Save them before approving or publishing.</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="h-8 rounded-lg" onClick={() => setForm(toForm(draft))} disabled={saving}>Discard</Button>
                <Button size="sm" className="h-8 rounded-lg bg-orange-500 text-white hover:bg-orange-600" onClick={save} disabled={saving}>
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Save changes
                </Button>
              </div>
            </div>
          )}
          {draft.status === "approved" && blockers.length > 0 && (
            <Callout tone="warn">
              <span className="font-semibold">Before publishing:</span>
              <ul className="mt-1 list-disc pl-4">{blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
            </Callout>
          )}
          {draft.status === "published" && draft.slug ? (
            <a href={`/blog/${draft.slug}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:underline">
              View the published post <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            <div className="flex flex-wrap justify-end gap-2">
              {availableActions.map((action) => {
                const config = ACTIONS[action]
                const Icon = config.icon
                const blocked = dirty || (action === "publish" && blockers.length > 0)
                return (
                  <Button
                    key={action}
                    size="sm"
                    disabled={blocked}
                    title={blocked ? (dirty ? "Save or discard your changes first." : blockers[0]) : undefined}
                    className={cn("h-9 rounded-xl border-0 font-bold", config.className)}
                    onClick={() => { setActionNote(""); setPendingAction(action) }}
                  >
                    <Icon className="h-4 w-4" />{config.label}
                  </Button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Confirmation ── */}
        <AlertDialog open={pendingAction !== null} onOpenChange={(value) => !value && !runningAction && setPendingAction(null)}>
          <AlertDialogContent>
            {pendingAction && (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>{ACTIONS[pendingAction].confirmTitle}</AlertDialogTitle>
                  <AlertDialogDescription>{ACTIONS[pendingAction].confirmBody}</AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea
                  rows={3}
                  value={actionNote}
                  maxLength={AI_DRAFT_LIMITS.note.max}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder={noteRequired ? "Required: explain what needs to change…" : "Optional note for the audit history"}
                />
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={runningAction}>Cancel</AlertDialogCancel>
                  <Button
                    className={cn("border-0 font-bold", ACTIONS[pendingAction].className)}
                    disabled={runningAction || (noteRequired && actionNote.trim().length < 3)}
                    onClick={runAction}
                  >
                    {runningAction && <Loader2 className="h-4 w-4 animate-spin" />}
                    {ACTIONS[pendingAction].label}
                  </Button>
                </AlertDialogFooter>
              </>
            )}
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  )
}

// ── Pieces ───────────────────────────────────────────────────────────────────

function StatusPipeline({ status }: { status: AiBlogDraft["status"] }) {
  const offTrack = status === "rejected" || status === "changes_requested"
  const reached = offTrack ? 1 : PIPELINE.indexOf(status as (typeof PIPELINE)[number])
  return (
    <ol className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold" aria-label="Moderation progress">
      {PIPELINE.map((step, index) => (
        <li key={step} className="flex items-center gap-1.5">
          <span className={cn(
            "rounded-full px-2 py-0.5",
            index < reached || (index === reached && !offTrack) ? "bg-orange-500/15 text-orange-700 dark:text-orange-300" : "bg-muted text-muted-foreground",
            index === reached && !offTrack && "ring-1 ring-orange-500/40"
          )}>
            {AI_DRAFT_STATUS_LABEL[step]}
          </span>
          {index < PIPELINE.length - 1 && <span className="text-muted-foreground/50">→</span>}
        </li>
      ))}
      {offTrack && (
        <li className={cn("ml-1 rounded-full px-2 py-0.5", status === "rejected" ? "bg-red-500/10 text-red-700 dark:text-red-400" : "bg-orange-500/10 text-orange-700")}>
          {AI_DRAFT_STATUS_LABEL[status]}
        </li>
      )}
    </ol>
  )
}

function Field({
  label, error, hint, count, children,
}: { label: string; error?: string; hint?: string; count?: [number, number]; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        {count && <span className={cn("text-[11px] tabular-nums", count[0] > count[1] ? "font-bold text-amber-600" : "text-muted-foreground")}>{count[0]}/{count[1]}</span>}
      </div>
      {children}
      {error ? <p className="text-xs font-semibold text-destructive">{error}</p> : hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function Callout({ tone, children }: { tone: "warn"; children: React.ReactNode }) {
  return (
    <div className={cn("flex gap-2 rounded-xl border px-3 py-2 text-xs", tone === "warn" && "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200")}>
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

/** Plain <img>: AI images may come from hosts next/image isn't configured for. Never fetched by our server. */
function DraftImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className={cn("flex items-center justify-center bg-muted text-muted-foreground", className)}>
        <ImageIcon className="h-8 w-8 opacity-40" />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary external hosts during review
    <img src={src} alt={alt} referrerPolicy="no-referrer" loading="lazy" onError={() => setFailed(true)} className={cn("object-cover", className)} />
  )
}

const AUDIT_LABEL: Record<AiDraftAuditEntry["action"], string> = {
  submit: "Submitted",
  edit: "Edited",
  start_review: "Started review",
  approve: "Approved",
  request_changes: "Requested changes",
  reject: "Rejected",
  reopen: "Reopened",
  publish: "Published",
}

function AuditHistory({ entries }: { entries: AiDraftAuditEntry[] | null }) {
  if (!entries) {
    return <div className="space-y-3">{[0, 1, 2].map((key) => <Skeleton key={key} className="h-14 w-full rounded-xl" />)}</div>
  }
  if (!entries.length) return <p className="py-8 text-center text-sm text-muted-foreground">No history yet.</p>
  return (
    <ol className="relative space-y-4 border-l border-border/60 pl-5">
      {entries.map((entry) => {
        const at = toDate(entry.at)
        return (
          <li key={entry.id} className="relative">
            <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-orange-500" />
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-bold">{AUDIT_LABEL[entry.action] ?? entry.action}</span>
              <span className="text-xs text-muted-foreground">by {entry.actor?.name || "Unknown"}{entry.actor?.email ? ` (${entry.actor.email})` : ""}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {at ? at.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Just now"}
              {entry.fromStatus && entry.fromStatus !== entry.toStatus && <> · {AI_DRAFT_STATUS_LABEL[entry.fromStatus]} → {AI_DRAFT_STATUS_LABEL[entry.toStatus]}</>}
            </p>
            {entry.changedFields?.length ? <p className="mt-1 text-xs text-muted-foreground">Changed: {entry.changedFields.join(", ")}</p> : null}
            {entry.note && <p className="mt-1 rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs">{entry.note}</p>}
          </li>
        )
      })}
    </ol>
  )
}
