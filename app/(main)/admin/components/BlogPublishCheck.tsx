"use client"

import { useState } from "react"
import {
  AlertTriangle, CheckCircle2, CircleDashed, Info, Loader2, OctagonAlert, Send, Sparkles, WandSparkles,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { auth } from "@/firebase/firebase"
import type { Category, UserProfile } from "@/firebase/firestore"
import { imageUrlProblem } from "@/lib/image-hosts"

/**
 * Pre-publish check for the blog editor: instant rule checks, an optional AI editorial review,
 * and one "Fix it" that fills every field that can be fixed automatically.
 */

export type BlogCheckValues = {
  title: string
  slug: string
  content: string
  excerpt: string
  keywords: string
  seoTitle: string
  seoDescription: string
  seoKeywords: string
  image: string
  categoryIds: string[]
  authorId: string
}

export type BlogCheckSetters = {
  setSlug: (v: string) => void
  setExcerpt: (v: string) => void
  setKeywords: (v: string) => void
  setSeoTitle: (v: string) => void
  setSeoDescription: (v: string) => void
  setSeoKeywords: (v: string) => void
  setCategoryIds: (v: string[]) => void
  setAuthorId: (v: string) => void
}

type Severity = "blocker" | "warning" | "tip"
type FixKind = "ai" | "auto" | null

type Check = {
  id: string
  label: string
  ok: boolean
  severity: Severity
  detail: string
  fix: FixKind
}

type AiIssue = { field: string; severity: Severity; message: string }
type AiFixes = {
  excerpt: string
  keywords: string[]
  seoTitle: string
  seoDescription: string
  seoKeywords: string[]
  categoryIds: string[]
}

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
const wordCount = (html: string) => stripHtml(html).split(" ").filter(Boolean).length
const headingsOf = (html: string) =>
  [...html.matchAll(/<h[2-3][^>]*>([\s\S]*?)<\/h[2-3]>/gi)].map((m) => stripHtml(m[1])).filter(Boolean)
const phraseCount = (value: string) => value.split(",").map((k) => k.trim()).filter(Boolean).length
const toSlug = (title: string) =>
  title.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "")

export function runBlogChecks(values: BlogCheckValues, ctx: { canSetAuthor: boolean }): Check[] {
  const words = wordCount(values.content)
  const headings = headingsOf(values.content).length
  const imageProblem = imageUrlProblem(values.image)
  const seoTitle = values.seoTitle.trim().length
  const seoDescription = values.seoDescription.trim().length

  return [
    { id: "title", label: "Post title", ok: values.title.trim().length >= 10, severity: "blocker", fix: null,
      detail: values.title.trim() ? "Make the title at least 10 characters." : "Add a title." },
    { id: "slug", label: "URL slug", ok: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug.trim()), severity: "blocker", fix: values.title.trim() ? "auto" : null,
      detail: "Lowercase words joined by hyphens, e.g. dog-ear-care." },
    { id: "content", label: "Article length", ok: words >= 300, severity: words < 80 ? "blocker" : "warning", fix: null,
      detail: `${words} words. Aim for 300+ so the post can rank and actually help readers.` },
    { id: "structure", label: "Subheadings", ok: words < 400 || headings >= 2, severity: "warning", fix: null,
      detail: "Break a long post into sections with at least two H2/H3 subheadings." },
    { id: "categories", label: "Category", ok: values.categoryIds.length > 0, severity: "blocker", fix: "ai",
      detail: "Pick at least one category." },
    { id: "author", label: "Author", ok: Boolean(values.authorId), severity: "blocker", fix: ctx.canSetAuthor ? "auto" : null,
      detail: "Choose who wrote the post." },
    { id: "image", label: "Featured image", ok: Boolean(values.image.trim()) && !imageProblem, severity: values.image.trim() ? "blocker" : "warning", fix: null,
      detail: imageProblem || "Add a featured image; it's used on cards and social shares." },
    { id: "excerpt", label: "Excerpt", ok: values.excerpt.trim().length >= 60, severity: "warning", fix: "ai",
      detail: "A 1–2 sentence summary for the blog list." },
    { id: "keywords", label: "Keywords", ok: phraseCount(values.keywords) >= 3, severity: "tip", fix: "ai",
      detail: "Add 3+ topic tags." },
    { id: "seoTitle", label: "SEO title (30–60)", ok: seoTitle >= 30 && seoTitle <= 60, severity: "warning", fix: "ai",
      detail: seoTitle ? `${seoTitle} characters.` : "Missing; Google will fall back to the post title." },
    { id: "seoDescription", label: "SEO description (120–160)", ok: seoDescription >= 120 && seoDescription <= 160, severity: "warning", fix: "ai",
      detail: seoDescription ? `${seoDescription} characters.` : "Missing; Google will pick random text from the post." },
    { id: "seoKeywords", label: "SEO keyphrases", ok: phraseCount(values.seoKeywords) >= 3, severity: "tip", fix: "ai",
      detail: "Add 3+ search phrases." },
  ]
}

/** Problems that should stop a publish without the author confirming */
export const blockingCount = (checks: Check[]) => checks.filter((c) => !c.ok && c.severity !== "tip").length

async function requestReview(values: BlogCheckValues, categories: Category[]) {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error("Sign in again to use AI.")
  const res = await fetch("/api/admin/blog/review", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      title: values.title,
      excerpt: values.excerpt,
      content: stripHtml(values.content).slice(0, 14000),
      headings: headingsOf(values.content),
      keywords: values.keywords,
      seoTitle: values.seoTitle,
      seoDescription: values.seoDescription,
      seoKeywords: values.seoKeywords,
      categories: categories.map((c) => ({ id: c.id, name: c.parentId ? `${categories.find((p) => p.id === c.parentId)?.name ?? ""} › ${c.name}` : c.name })),
      selectedCategoryIds: values.categoryIds,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || "AI couldn't review the post right now.")
  return body as { issues: AiIssue[]; fixes: AiFixes }
}

const SEVERITY_STYLE: Record<Severity, { icon: typeof AlertTriangle; className: string; label: string }> = {
  blocker: { icon: OctagonAlert, className: "text-red-600", label: "Must fix" },
  warning: { icon: AlertTriangle, className: "text-amber-600", label: "Should fix" },
  tip: { icon: Info, className: "text-sky-600", label: "Tip" },
}

export function BlogPublishCheck({
  open, onOpenChange, values, setters, categories, authors, currentUserId, publishing, onPublish,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  values: BlogCheckValues
  setters: BlogCheckSetters
  categories: Category[]
  authors: UserProfile[]
  currentUserId?: string
  /** True when the editor's visibility is Published, so the footer offers to publish */
  publishing: boolean
  onPublish: () => void
}) {
  const [aiIssues, setAiIssues] = useState<AiIssue[] | null>(null)
  const [aiFixes, setAiFixes] = useState<AiFixes | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [fixing, setFixing] = useState(false)

  const authorCandidate = authors.find((a) => a.id === currentUserId)?.id ?? (authors.length === 1 ? authors[0].id : "")
  const checks = runBlogChecks(values, { canSetAuthor: Boolean(authorCandidate) })
  const failing = checks.filter((c) => !c.ok)
  const fixable = failing.filter((c) => c.fix)
  const blocking = blockingCount(checks) + (aiIssues?.filter((i) => i.severity === "blocker").length ?? 0)

  const review = async () => {
    setReviewing(true)
    try {
      const result = await requestReview(values, categories)
      setAiIssues(result.issues)
      setAiFixes(result.fixes)
      return result.fixes
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI review failed.")
      return null
    } finally {
      setReviewing(false)
    }
  }

  /** Fills every failing field that has an automatic fix; leaves passing fields untouched */
  const fixAll = async () => {
    setFixing(true)
    try {
      const needsAi = fixable.some((c) => c.fix === "ai")
      const fixes = needsAi ? aiFixes ?? (await review()) : aiFixes
      let applied = 0
      for (const check of fixable) {
        if (check.id === "slug") { setters.setSlug(toSlug(values.title)); applied++ }
        if (check.id === "author" && authorCandidate) { setters.setAuthorId(authorCandidate); applied++ }
        if (!fixes) continue
        if (check.id === "excerpt" && fixes.excerpt) { setters.setExcerpt(fixes.excerpt); applied++ }
        if (check.id === "keywords" && fixes.keywords.length) { setters.setKeywords(fixes.keywords.join(", ")); applied++ }
        if (check.id === "seoTitle" && fixes.seoTitle) { setters.setSeoTitle(fixes.seoTitle); applied++ }
        if (check.id === "seoDescription" && fixes.seoDescription) { setters.setSeoDescription(fixes.seoDescription); applied++ }
        if (check.id === "seoKeywords" && fixes.seoKeywords.length) { setters.setSeoKeywords(fixes.seoKeywords.join(", ")); applied++ }
        if (check.id === "categories" && fixes.categoryIds.length) { setters.setCategoryIds(fixes.categoryIds); applied++ }
      }
      const manual = failing.length - applied
      if (applied) toast.success(`Fixed ${applied} ${applied === 1 ? "item" : "items"}.${manual > 0 ? ` ${manual} need${manual === 1 ? "s" : ""} your edit.` : ""}`)
      else if (fixable.length) toast.error("Nothing could be filled automatically. Try again.")
    } finally {
      setFixing(false)
    }
  }

  const busy = reviewing || fixing

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" />
            {publishing ? "Before you publish" : "Post check"}
          </DialogTitle>
          <DialogDescription>
            {failing.length === 0 && !aiIssues?.length
              ? "Everything checks out."
              : `${failing.length} of ${checks.length} checks need attention${blocking ? `, ${blocking} must be fixed` : ""}.`}
          </DialogDescription>
        </DialogHeader>

        <ul className="divide-y divide-border/50 rounded-xl border border-border/60">
          {[...failing, ...checks.filter((c) => c.ok)].map((check) => {
            const style = SEVERITY_STYLE[check.severity]
            const Icon = check.ok ? CheckCircle2 : style.icon
            return (
              <li key={check.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${check.ok ? "text-emerald-600" : style.className}`} />
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold ${check.ok ? "text-muted-foreground" : ""}`}>{check.label}</p>
                  {!check.ok && <p className="text-xs text-muted-foreground">{check.detail}</p>}
                </div>
                {!check.ok && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    check.fix ? "bg-violet-500/10 text-violet-700 dark:text-violet-300" : "bg-muted text-muted-foreground"
                  }`}>
                    {check.fix === "ai" ? "AI can fix" : check.fix === "auto" ? "Auto-fix" : "Manual"}
                  </span>
                )}
              </li>
            )
          })}
        </ul>

        {/* AI editorial review */}
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <WandSparkles className="h-4 w-4 text-violet-600" /> AI editor review
            </p>
            <Button type="button" size="sm" variant="outline" className="rounded-xl" disabled={busy} onClick={() => void review()}>
              {reviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {aiIssues ? "Review again" : "Review content"}
            </Button>
          </div>
          {aiIssues === null ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Reads the article for thin sections, missing intro or conclusion, unsafe health advice and mistakes.
            </p>
          ) : aiIssues.length === 0 ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> No content problems found.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {aiIssues.map((issue, index) => {
                const style = SEVERITY_STYLE[issue.severity]
                const Icon = style.icon
                return (
                  <li key={index} className="flex items-start gap-2 text-xs">
                    <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${style.className}`} />
                    <span>
                      <span className={`font-semibold ${style.className}`}>{style.label} · {issue.field}: </span>
                      {issue.message}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            disabled={busy || fixable.length === 0}
            onClick={() => void fixAll()}
            className="rounded-xl bg-violet-600 text-white hover:bg-violet-700"
          >
            {fixing ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
            {fixable.length ? `Fix it (${fixable.length})` : "Nothing to auto-fix"}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Keep editing
            </Button>
            {publishing && (
              <Button
                type="button"
                disabled={busy}
                onClick={onPublish}
                className={`rounded-xl text-white ${blocking ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
              >
                {blocking ? <CircleDashed className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                {blocking ? "Publish anyway" : "Publish"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
