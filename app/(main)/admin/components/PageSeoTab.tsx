"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { FormEvent } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Globe2,
  Loader2,
  Search,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { auth } from "@/firebase/firebase"
import {
  getBlogs,
  getPageSeoConfigs,
  savePageSeoConfig,
  updateBlog,
  type Blog,
  type PageSeoConfig,
  type PageSeoKey,
  type SeoConfigFields,
} from "@/firebase/firestore"

const SITE_URL = "https://pawsattva.com"

// `about` tells the AI what each page is for when it drafts the page's SEO.
const PAGE_OPTIONS: { key: PageSeoKey; label: string; pathname: string; about: string }[] = [
  { key: "home", label: "Home", pathname: "/", about: "Home page of Paw Sattva, an Indian pet wellness platform for dogs and cats: expert nutrition and care articles, a pet body-condition and feeding assessment, a food logger, Paw GPT pet assistant, vet consultations and city walk guides." },
  { key: "blog", label: "Blogs", pathname: "/blog", about: "Blog index listing Paw Sattva's articles on dog and cat nutrition, breeds, grooming, health warning signs, training and everyday care for pet parents in India." },
  { key: "pet-feed", label: "Pet Feed", pathname: "/pet-feed", about: "Free pet assessment: add your dog or cat's breed, age, weight and activity, get a body-condition score and a personalised feeding plan with portions and meal timing." },
  { key: "consultation", label: "Consultation", pathname: "/consultation", about: "Book an online consultation with a veterinarian or pet nutrition expert for diet plans, weight management and health concerns about your dog or cat." },
  { key: "walks", label: "Walks", pathname: "/walks", about: "Pet-friendly walking spots, parks and approved vet hospitals and clinics in Indian cities such as Hyderabad, for dog owners planning walks and emergencies." },
]

type AiSeo = Pick<SeoConfigFields, "title" | "description" | "keywords" | "ogTitle" | "ogDescription" | "twitterTitle" | "twitterDescription">

/** What the AI is told about one page or post */
type SeoSubject = {
  kind: "page" | "blog"
  url: string
  title: string
  summary: string
  content: string
  keywords: string[]
  image?: string
  blog?: Blog
}

const emptySeo = (canonicalUrl = ""): SeoConfigFields => ({
  title: "",
  description: "",
  keywords: [],
  canonicalUrl,
  robots: "index,follow",
  image: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  twitterTitle: "",
  twitterDescription: "",
  twitterImage: "",
  schemaJson: "",
})

const normalizeKeywords = (value: string) =>
  [...new Set(value.split(",").map((keyword) => keyword.trim()).filter(Boolean))].slice(0, 15)

const validateSchema = (value?: string) => {
  if (!value?.trim()) return { valid: false, message: "Missing JSON-LD" }
  try {
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== "object") return { valid: false, message: "Schema must be a JSON object" }
    if (!parsed["@context"] || !parsed["@type"]) return { valid: false, message: "Add @context and @type" }
    return { valid: true, message: "Valid JSON-LD" }
  } catch {
    return { valid: false, message: "Invalid JSON" }
  }
}

const seoScore = (seo: SeoConfigFields) => {
  let score = 0
  if (seo.title.trim().length >= 30 && seo.title.trim().length <= 60) score += 20
  if (seo.description.trim().length >= 120 && seo.description.trim().length <= 160) score += 20
  if (seo.keywords.length >= 3) score += 10
  if (seo.canonicalUrl?.startsWith("http")) score += 10
  if ((seo.robots || "").trim()) score += 5
  if ((seo.ogTitle || seo.title).trim()) score += 5
  if ((seo.ogDescription || seo.description).trim()) score += 5
  if ((seo.ogImage || seo.image || "").trim()) score += 10
  if ((seo.twitterTitle || seo.title).trim()) score += 5
  if ((seo.twitterDescription || seo.description).trim()) score += 5
  if (validateSchema(seo.schemaJson).valid) score += 5
  return score
}

type SeoReadinessStatus = "ready" | "incomplete" | "critical"

const statusFor = (seo: SeoConfigFields): SeoReadinessStatus => {
  const score = seoScore(seo)
  if (score >= 90) return "ready"
  if (score >= 60) return "incomplete"
  return "critical"
}

const stripHtml = (value = "") =>
  value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()

const titleOk = (value: string) => value.trim().length >= 30 && value.trim().length <= 60
const descriptionOk = (value: string) => value.trim().length >= 120 && value.trim().length <= 160

const isoDate = (value: unknown) => {
  const date = typeof value === "object" && value && "toDate" in value
    ? (value as { toDate: () => Date }).toDate()
    : value ? new Date(value as string) : null
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : undefined
}

/** JSON-LD built from the page data itself, so it is always valid (no AI needed) */
const buildSchema = (subject: SeoSubject, seo: SeoConfigFields) => {
  const publisher = { "@type": "Organization", name: "Paw Sattva", url: SITE_URL }
  const image = seo.ogImage || seo.image || subject.image
  const schema = subject.kind === "blog"
    ? {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: seo.title || subject.title,
        description: seo.description,
        ...(image ? { image } : {}),
        url: subject.url,
        mainEntityOfPage: { "@type": "WebPage", "@id": subject.url },
        ...(isoDate(subject.blog?.date) ? { datePublished: isoDate(subject.blog?.date) } : {}),
        ...(isoDate(subject.blog?.updatedAt) ? { dateModified: isoDate(subject.blog?.updatedAt) } : {}),
        author: { "@type": "Organization", name: subject.blog?.authorName || "Paw Sattva" },
        publisher,
        keywords: seo.keywords.join(", "),
      }
    : {
        "@context": "https://schema.org",
        "@type": subject.url === `${SITE_URL}/` ? "WebSite" : "WebPage",
        name: seo.title || subject.title,
        description: seo.description,
        url: subject.url,
        ...(image ? { image } : {}),
        publisher,
      }
  return JSON.stringify(schema, null, 2)
}

/**
 * Merges AI copy into the current SEO. "missing" only touches fields that are empty or failing a
 * readiness check; "all" rewrites the text fields too. URLs, images and schema are rule-based.
 */
const mergeSeo = (current: SeoConfigFields, ai: AiSeo | null, subject: SeoSubject, mode: "missing" | "all") => {
  const replace = (value: string | undefined, ok: boolean) => mode === "all" || !value?.trim() || !ok
  const next: SeoConfigFields = { ...current }
  if (ai) {
    if (replace(next.title, titleOk(next.title)) && ai.title) next.title = ai.title
    if (replace(next.description, descriptionOk(next.description)) && ai.description) next.description = ai.description
    if (mode === "all" || next.keywords.length < 3) {
      next.keywords = [...new Set([...(mode === "all" ? [] : next.keywords), ...ai.keywords])].slice(0, 15)
    }
    for (const key of ["ogTitle", "ogDescription", "twitterTitle", "twitterDescription"] as const) {
      if (replace(next[key], true) && ai[key]) next[key] = ai[key]
    }
  }
  if (!next.canonicalUrl?.startsWith("http")) next.canonicalUrl = subject.url
  if (!next.robots?.trim()) next.robots = "index,follow"
  if (!next.image?.trim() && subject.image) next.image = subject.image
  if (!next.ogImage?.trim() && next.image) next.ogImage = next.image
  if (!next.twitterImage?.trim() && (next.ogImage || next.image)) next.twitterImage = next.ogImage || next.image
  if (!validateSchema(next.schemaJson).valid) next.schemaJson = buildSchema(subject, next)
  return next
}

/** Text fields the AI would change in "missing" mode; empty means rules alone can finish the job */
const needsAi = (seo: SeoConfigFields) =>
  !titleOk(seo.title) || !descriptionOk(seo.description) || seo.keywords.length < 3 ||
  !seo.ogTitle?.trim() || !seo.ogDescription?.trim() || !seo.twitterTitle?.trim() || !seo.twitterDescription?.trim()

async function draftSeoWithAi(subject: SeoSubject): Promise<AiSeo> {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error("Sign in again to use AI.")
  const res = await fetch("/api/admin/seo/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      kind: subject.kind,
      url: subject.url,
      title: subject.title,
      summary: subject.summary,
      content: subject.content,
      keywords: subject.keywords,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || "AI couldn't draft SEO right now.")
  return body as AiSeo
}

export function PageSeoTab() {
  const [scope, setScope] = useState<"pages" | "blogs">("pages")
  const [configs, setConfigs] = useState<Partial<Record<PageSeoKey, PageSeoConfig>>>({})
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [selectedPage, setSelectedPage] = useState<PageSeoKey>("home")
  const [selectedBlogId, setSelectedBlogId] = useState("")
  const [draft, setDraft] = useState<SeoConfigFields>(emptySeo(SITE_URL))
  const [keywordText, setKeywordText] = useState("")
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "ready" | "incomplete" | "critical">("all")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [aiBusy, setAiBusy] = useState<"missing" | "all" | null>(null)
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [bulk, setBulk] = useState<{ done: number; total: number; failed: number } | null>(null)
  const bulkStop = useRef(false)

  useEffect(() => {
    Promise.all([getPageSeoConfigs(), getBlogs()])
      .then(([pageItems, blogItems]) => {
        setConfigs(Object.fromEntries(pageItems.map((item) => [item.key, item])))
        setBlogs(blogItems)
        const firstPublished = blogItems.find((blog) => blog.status === "published") || blogItems[0]
        if (firstPublished) setSelectedBlogId(firstPublished.id)
      })
      .catch((error) => {
        console.error(error)
        toast.error("Unable to load SEO command center.")
      })
      .finally(() => setLoading(false))
  }, [])

  const selectedPageOption = PAGE_OPTIONS.find((page) => page.key === selectedPage)!
  const selectedBlog = blogs.find((blog) => blog.id === selectedBlogId)

  useEffect(() => {
    if (scope === "pages") {
      const config = configs[selectedPage]
      const next = config
        ? { ...emptySeo(`${SITE_URL}${selectedPageOption.pathname}`), ...config }
        : emptySeo(`${SITE_URL}${selectedPageOption.pathname}`)
      setDraft(next)
      setKeywordText(next.keywords.join(", "))
      return
    }

    if (!selectedBlog) return
    const fallbackDescription =
      selectedBlog.excerpt || stripHtml(selectedBlog.content).slice(0, 155)
    const next = {
      ...emptySeo(`${SITE_URL}/blog/${selectedBlog.slug}`),
      title: selectedBlog.title,
      description: fallbackDescription,
      keywords: normalizeKeywords(selectedBlog.keywords || ""),
      image: selectedBlog.image || "",
      ogImage: selectedBlog.image || "",
      ...selectedBlog.seo,
    }
    setDraft(next)
    setKeywordText(next.keywords.join(", "))
  }, [scope, selectedPage, selectedPageOption.pathname, configs, selectedBlog])

  const keywords = useMemo(() => normalizeKeywords(keywordText), [keywordText])
  const workingSeo = useMemo(() => ({ ...draft, keywords }), [draft, keywords])
  const schemaValidation = validateSchema(workingSeo.schemaJson)
  const currentScore = seoScore(workingSeo)

  const pageRows = useMemo(() => PAGE_OPTIONS.map((page) => {
    const seo = configs[page.key]
      ? { ...emptySeo(`${SITE_URL}${page.pathname}`), ...configs[page.key]! }
      : emptySeo(`${SITE_URL}${page.pathname}`)
    return { ...page, seo, score: seoScore(seo), status: statusFor(seo) }
  }), [configs])

  const blogRows = useMemo(() => blogs.map((blog) => {
    const seo = {
      ...emptySeo(`${SITE_URL}/blog/${blog.slug}`),
      title: blog.title,
      description: blog.excerpt || stripHtml(blog.content).slice(0, 155),
      keywords: normalizeKeywords(blog.keywords || ""),
      image: blog.image || "",
      ogImage: blog.image || "",
      ...blog.seo,
    }
    return { blog, seo, score: seoScore(seo), status: statusFor(seo) }
  }), [blogs])

  const filteredBlogs = useMemo(() => {
    const q = query.trim().toLowerCase()
    return blogRows.filter((row) => {
      const matchesQuery = !q || row.blog.title.toLowerCase().includes(q) || row.blog.slug.toLowerCase().includes(q)
      const matchesStatus = statusFilter === "all" || row.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [blogRows, query, statusFilter])

  const summaryRows = scope === "pages" ? pageRows : blogRows
  const counts = {
    ready: summaryRows.filter((row) => row.status === "ready").length,
    incomplete: summaryRows.filter((row) => row.status === "incomplete").length,
    critical: summaryRows.filter((row) => row.status === "critical").length,
  }

  const pageSubject = (page: (typeof PAGE_OPTIONS)[number]): SeoSubject => ({
    kind: "page",
    url: `${SITE_URL}${page.pathname}`,
    title: `${page.label} | Paw Sattva`,
    summary: page.about,
    content: "",
    keywords: configs[page.key]?.keywords ?? [],
  })

  const blogSubject = (blog: Blog): SeoSubject => ({
    kind: "blog",
    url: `${SITE_URL}/blog/${blog.slug}`,
    title: blog.title,
    summary: blog.excerpt || "",
    content: stripHtml(blog.content).slice(0, 8000),
    keywords: normalizeKeywords(blog.keywords || ""),
    image: blog.image,
    blog,
  })

  const currentSubject = scope === "pages" ? pageSubject(selectedPageOption) : selectedBlog ? blogSubject(selectedBlog) : null

  /** Fills the editor only; the admin reviews and presses Save */
  const fillWithAi = async (mode: "missing" | "all") => {
    if (!currentSubject) return
    setAiBusy(mode)
    try {
      const ai = mode === "all" || needsAi(workingSeo) ? await draftSeoWithAi(currentSubject) : null
      const next = mergeSeo(workingSeo, ai, currentSubject, mode)
      setDraft(next)
      setKeywordText(next.keywords.join(", "))
      toast.success(`${mode === "all" ? "AI rewrite" : "Missing fields filled"} — now at ${seoScore(next)}%. Review, then Save SEO.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI couldn't draft SEO right now.")
    } finally {
      setAiBusy(null)
    }
  }

  const incompleteCount = (scope === "pages" ? pageRows : blogRows).filter((row) => row.status !== "ready").length

  /** Drafts and saves every page or post that isn't Ready, one at a time */
  const fixAllIncomplete = async () => {
    const runScope = scope
    const targets = runScope === "pages"
      ? pageRows.filter((row) => row.status !== "ready").map((row) => ({ id: row.key as string, seo: row.seo, subject: pageSubject(row) }))
      : blogRows.filter((row) => row.status !== "ready").map((row) => ({ id: row.blog.id, seo: row.seo, subject: blogSubject(row.blog) }))
    if (!targets.length) return

    bulkStop.current = false
    let done = 0
    let failed = 0
    setBulk({ done, total: targets.length, failed })
    for (const target of targets) {
      if (bulkStop.current) break
      try {
        const ai = needsAi(target.seo) ? await draftSeoWithAi(target.subject) : null
        const next = mergeSeo(target.seo, ai, target.subject, "missing")
        if (runScope === "pages") {
          const config: PageSeoConfig = { key: target.id as PageSeoKey, ...next }
          await savePageSeoConfig(config)
          setConfigs((current) => ({ ...current, [target.id]: config }))
        } else {
          await updateBlog(target.id, { seo: next })
          setBlogs((current) => current.map((blog) => (blog.id === target.id ? { ...blog, seo: next } : blog)))
        }
      } catch (error) {
        failed++
        console.error(`AI SEO failed for ${target.subject.url}:`, error)
      }
      done++
      setBulk({ done, total: targets.length, failed })
    }
    setBulk(null)
    const saved = done - failed
    if (failed) toast.error(`Saved ${saved} of ${targets.length}. ${failed} failed — try those again.`)
    else toast.success(`${bulkStop.current ? "Stopped. " : ""}AI SEO saved for ${saved} ${saved === 1 ? "item" : "items"}.`)
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!workingSeo.title.trim() || !workingSeo.description.trim()) {
      toast.error("Title and description are required.")
      return
    }
    if (workingSeo.schemaJson?.trim() && !schemaValidation.valid) {
      toast.error(schemaValidation.message)
      return
    }

    setSaving(true)
    try {
      if (scope === "pages") {
        const config: PageSeoConfig = { key: selectedPage, ...workingSeo }
        await savePageSeoConfig(config)
        setConfigs((current) => ({ ...current, [selectedPage]: config }))
        toast.success("Page SEO saved and ready for the public page.")
      } else if (selectedBlog) {
        await updateBlog(selectedBlog.id, { seo: workingSeo })
        setBlogs((current) =>
          current.map((blog) => blog.id === selectedBlog.id ? { ...blog, seo: workingSeo } : blog)
        )
        toast.success("Blog SEO saved.")
      }
    } catch (error) {
      console.error(error)
      toast.error("SEO save failed.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-orange-500" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-orange-700">
            <Sparkles className="h-3.5 w-3.5" /> SEO Command Center
          </div>
          <h2 className="mt-3 text-3xl font-black tracking-tight">PawSattva search control</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Manage metadata, canonical URLs, robots, Open Graph, Twitter cards and Schema.org JSON-LD page by page and blog by blog.
          </p>
        </div>

        <div className="inline-flex rounded-2xl border bg-background p-1 shadow-sm">
          <Button type="button" variant={scope === "pages" ? "default" : "ghost"} onClick={() => setScope("pages")} disabled={Boolean(bulk)} className="rounded-xl">
            <Globe2 className="mr-2 h-4 w-4" /> Pages
          </Button>
          <Button type="button" variant={scope === "blogs" ? "default" : "ghost"} onClick={() => setScope("blogs")} disabled={Boolean(bulk)} className="rounded-xl">
            <FileText className="mr-2 h-4 w-4" /> Blogs
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Ready" value={counts.ready} tone="emerald" />
        <StatCard label="Incomplete" value={counts.incomplete} tone="amber" />
        <StatCard label="Critical" value={counts.critical} tone="rose" />
      </div>

      {/* Bulk AI fix for everything in this scope that isn't Ready */}
      {(incompleteCount > 0 || bulk) && (
        <div className="flex flex-col gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
          {bulk ? (
            <>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
                  Fixing {Math.min(bulk.done + 1, bulk.total)} of {bulk.total}…
                  {bulk.failed > 0 && <span className="text-xs text-rose-600">{bulk.failed} failed</span>}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-violet-500/10">
                  <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${(bulk.done / bulk.total) * 100}%` }} />
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => { bulkStop.current = true }}>
                Stop
              </Button>
            </>
          ) : (
            <>
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <WandSparkles className="h-4 w-4 text-violet-600" />
                  {incompleteCount} {scope === "pages" ? (incompleteCount === 1 ? "page" : "pages") : incompleteCount === 1 ? "post" : "posts"} not ready
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  AI drafts the missing titles, descriptions, keywords and social copy; URLs, images and Schema.org are filled from the page itself. Fields that already pass are kept.
                </p>
              </div>
              <Button type="button" onClick={() => setBulkConfirm(true)} className="shrink-0 rounded-xl bg-violet-600 text-white hover:bg-violet-700">
                <WandSparkles className="h-4 w-4" /> Fix all with AI
              </Button>
            </>
          )}
        </div>
      )}

      <AlertDialog open={bulkConfirm} onOpenChange={setBulkConfirm}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Fix {incompleteCount} with AI and save?</AlertDialogTitle>
            <AlertDialogDescription>
              AI fills the failing fields on every {scope === "pages" ? "page" : "blog post"} that isn&apos;t Ready, and each one is saved as it finishes. Fields that already pass stay as they are. You can stop at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void fixAllIncomplete()}>Fix and save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {scope === "pages" ? (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {pageRows.map((page) => (
            <button
              key={page.key}
              type="button"
              onClick={() => setSelectedPage(page.key)}
              className={`rounded-2xl border p-4 text-left transition ${selectedPage === page.key ? "border-orange-500 bg-orange-500/10" : "hover:bg-muted/50"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold">{page.label}</span>
                <ScoreBadge score={page.score} />
              </div>
              <span className="mt-1 block text-xs text-muted-foreground">{page.pathname}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search blog title or slug…" className="pl-10" />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {(["all", "critical", "incomplete", "ready"] as const).map((status) => (
                <Button key={status} type="button" variant={statusFilter === status ? "default" : "outline"} onClick={() => setStatusFilter(status)} className="capitalize">
                  {status}
                </Button>
              ))}
            </div>
          </div>

          <div className="max-h-72 overflow-auto rounded-2xl border bg-background/70">
            {filteredBlogs.map(({ blog, score, status }) => (
              <button
                key={blog.id}
                type="button"
                onClick={() => setSelectedBlogId(blog.id)}
                className={`flex w-full items-center justify-between gap-4 border-b px-4 py-3 text-left last:border-0 ${selectedBlogId === blog.id ? "bg-orange-500/10" : "hover:bg-muted/50"}`}
              >
                <div className="min-w-0">
                  <p className="truncate font-bold">{blog.title}</p>
                  <p className="truncate text-xs text-muted-foreground">/blog/{blog.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={status} />
                  <ScoreBadge score={score} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={save} className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2"><SearchCheck className="h-5 w-5 text-orange-500" /> SEO editor</span>
              <ScoreBadge score={currentScore} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] p-3">
              <WandSparkles className="h-4 w-4 shrink-0 text-violet-600" />
              <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                Let AI draft this {scope === "pages" ? "page's" : "post's"} SEO. Nothing is saved until you press Save SEO.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => void fillWithAi("missing")}
                disabled={Boolean(aiBusy) || Boolean(bulk) || !currentSubject}
                className="rounded-xl bg-violet-600 text-white hover:bg-violet-700"
              >
                {aiBusy === "missing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Fill missing
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void fillWithAi("all")}
                disabled={Boolean(aiBusy) || Boolean(bulk) || !currentSubject}
                className="rounded-xl"
              >
                {aiBusy === "all" && <Loader2 className="h-4 w-4 animate-spin" />}
                Rewrite all
              </Button>
            </div>

            <Field label="SEO title" hint={`${workingSeo.title.trim().length}/60`}>
              <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </Field>

            <Field label="Meta description" hint={`${workingSeo.description.trim().length}/160`}>
              <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="min-h-28" />
            </Field>

            <Field label="Keywords" hint={`${keywords.length} phrases`}>
              <Textarea value={keywordText} onChange={(e) => setKeywordText(e.target.value)} placeholder="pet nutrition, dog diet, cat wellness" />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Canonical URL">
                <Input value={draft.canonicalUrl || ""} onChange={(e) => setDraft({ ...draft, canonicalUrl: e.target.value })} />
              </Field>
              <Field label="Robots">
                <Input value={draft.robots || ""} onChange={(e) => setDraft({ ...draft, robots: e.target.value })} placeholder="index,follow" />
              </Field>
            </div>

            <Field label="Primary / fallback image">
              <Input value={draft.image || ""} onChange={(e) => setDraft({ ...draft, image: e.target.value })} placeholder="https://…" />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Open Graph title"><Input value={draft.ogTitle || ""} onChange={(e) => setDraft({ ...draft, ogTitle: e.target.value })} /></Field>
              <Field label="Twitter title"><Input value={draft.twitterTitle || ""} onChange={(e) => setDraft({ ...draft, twitterTitle: e.target.value })} /></Field>
              <Field label="Open Graph description"><Textarea value={draft.ogDescription || ""} onChange={(e) => setDraft({ ...draft, ogDescription: e.target.value })} /></Field>
              <Field label="Twitter description"><Textarea value={draft.twitterDescription || ""} onChange={(e) => setDraft({ ...draft, twitterDescription: e.target.value })} /></Field>
              <Field label="Open Graph image"><Input value={draft.ogImage || ""} onChange={(e) => setDraft({ ...draft, ogImage: e.target.value })} /></Field>
              <Field label="Twitter image"><Input value={draft.twitterImage || ""} onChange={(e) => setDraft({ ...draft, twitterImage: e.target.value })} /></Field>
            </div>

            <Field label="Schema.org JSON-LD" hint={schemaValidation.message}>
              <Textarea
                value={draft.schemaJson || ""}
                onChange={(e) => setDraft({ ...draft, schemaJson: e.target.value })}
                className="min-h-72 font-mono text-xs"
                placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "WebPage"\n}'}
              />
            </Field>

            <div className={`flex items-center gap-2 rounded-2xl border p-3 text-sm font-semibold ${schemaValidation.valid ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
              {schemaValidation.valid ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {schemaValidation.message}
            </div>

            <Button type="submit" disabled={saving} className="h-11 rounded-xl px-6 font-bold">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save SEO
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl">
            <CardHeader><CardTitle>Google preview</CardTitle></CardHeader>
            <CardContent>
              <p className="truncate text-sm text-emerald-700">{workingSeo.canonicalUrl || SITE_URL}</p>
              <p className="mt-1 text-xl font-medium text-blue-700">{workingSeo.title || "SEO title preview"}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{workingSeo.description || "Meta description preview."}</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardHeader><CardTitle>Readiness checks</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Check label="Title 30–60 chars" ok={workingSeo.title.trim().length >= 30 && workingSeo.title.trim().length <= 60} />
              <Check label="Description 120–160 chars" ok={workingSeo.description.trim().length >= 120 && workingSeo.description.trim().length <= 160} />
              <Check label="3+ keyword phrases" ok={keywords.length >= 3} />
              <Check label="Canonical URL" ok={Boolean(workingSeo.canonicalUrl?.startsWith("http"))} />
              <Check label="Social image" ok={Boolean(workingSeo.ogImage || workingSeo.image)} />
              <Check label="Valid Schema.org JSON-LD" ok={schemaValidation.valid} />
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center justify-between gap-3">
        <span>{label}</span>
        {hint && <span className="text-xs font-medium text-muted-foreground">{hint}</span>}
      </Label>
      {children}
    </div>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 90 ? "bg-emerald-500/10 text-emerald-700" : score >= 60 ? "bg-amber-500/10 text-amber-700" : "bg-rose-500/10 text-rose-700"
  return <span className={`rounded-full px-2.5 py-1 text-xs font-black ${tone}`}>{score}%</span>
}

function StatusBadge({ status }: { status: SeoReadinessStatus }) {
  const tone = status === "ready" ? "bg-emerald-500/10 text-emerald-700" : status === "incomplete" ? "bg-amber-500/10 text-amber-700" : "bg-rose-500/10 text-rose-700"
  return <span className={`hidden rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide sm:inline ${tone}`}>{status}</span>
}

function Check({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
      <span>{label}</span>
    </div>
  )
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "emerald" | "amber" | "rose" }) {
  const style = tone === "emerald" ? "border-emerald-200 bg-emerald-50/70 text-emerald-800" : tone === "amber" ? "border-amber-200 bg-amber-50/70 text-amber-800" : "border-rose-200 bg-rose-50/70 text-rose-800"
  return (
    <div className={`rounded-2xl border p-4 ${style}`}>
      <p className="text-xs font-black uppercase tracking-[0.18em]">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  )
}
