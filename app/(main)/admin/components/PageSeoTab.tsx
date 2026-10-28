"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { FormEvent, ReactNode } from "react"
import {
  AlertTriangle,
  Braces,
  CheckCircle2,
  FileText,
  Globe2,
  ImageIcon,
  Link2,
  Loader2,
  Save,
  Search,
  SearchCheck,
  Share2,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

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
import { refreshPublicBlogPages } from "@/lib/blog-revalidate"
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
import { ActionButton, FilterTabs, TableSearch } from "./DataTable"

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
    void refreshPublicBlogPages()
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
      void refreshPublicBlogPages()
    } catch (error) {
      console.error(error)
      toast.error("SEO save failed.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <SeoSkeleton />

  const setField = <K extends keyof SeoConfigFields>(key: K, value: SeoConfigFields[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  // What's saved for the item on screen, to tell whether the editor has unsaved changes
  const savedSeo = scope === "pages"
    ? pageRows.find((row) => row.key === selectedPage)?.seo
    : blogRows.find((row) => row.blog.id === selectedBlogId)?.seo
  const dirty = Boolean(savedSeo) && seoSignature(workingSeo) !== seoSignature(savedSeo!)
  const averageScore = summaryRows.length ? Math.round(summaryRows.reduce((sum, row) => sum + row.score, 0) / summaryRows.length) : 0
  const subjectLabel = scope === "pages" ? selectedPageOption.label : selectedBlog?.title ?? "Choose a post"
  const subjectUrl = currentSubject?.url ?? SITE_URL
  const displayUrl = (workingSeo.canonicalUrl || subjectUrl).replace(/^https?:\/\//, "").replace(/\/$/, "").split("/").join(" › ")
  const socialImage = workingSeo.ogImage || workingSeo.image || ""
  const checks = [
    { label: "Title 30–60 chars", ok: titleOk(workingSeo.title) },
    { label: "Description 120–160 chars", ok: descriptionOk(workingSeo.description) },
    { label: "3+ keyword phrases", ok: keywords.length >= 3 },
    { label: "Canonical URL", ok: Boolean(workingSeo.canonicalUrl?.startsWith("http")) },
    { label: "Social image", ok: Boolean(socialImage) },
    { label: "Valid Schema.org JSON-LD", ok: schemaValidation.valid },
  ]
  const passed = checks.filter((check) => check.ok).length
  const busy = Boolean(aiBusy) || Boolean(bulk)

  return (
    <div className="space-y-6">
      {/* Hero, like the profile page: gradient rim, title and scope on the left, scores on the right.
          The bulk AI strip below always takes the same space, whatever it's showing. */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 p-[2px] shadow-xl shadow-orange-500/10">
        <div className="relative overflow-hidden rounded-[1.9rem] bg-white/95 p-5 backdrop-blur-2xl sm:p-6 dark:bg-black/90">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-orange-400/10 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-500/30">
                <SearchCheck className="h-7 w-7" />
              </span>
              <div className="min-w-0">
                <h2 className="text-2xl font-black tracking-tight sm:text-3xl">SEO Command Center</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Metadata, canonical URLs, robots, social cards and JSON-LD for every page and blog post.
                </p>
                <div
                  aria-disabled={Boolean(bulk) || undefined}
                  title={bulk ? "Wait for the bulk AI fix to finish" : undefined}
                  className={`mt-3 w-fit ${bulk ? "pointer-events-none opacity-50" : ""}`}
                >
                  <FilterTabs<"pages" | "blogs">
                    label="SEO scope"
                    tabs={[
                      { id: "pages", label: "Pages", icon: Globe2 },
                      { id: "blogs", label: "Blogs", icon: FileText },
                    ]}
                    value={scope}
                    onChange={(next) => { if (!bulk) setScope(next) }}
                    counts={{ pages: PAGE_OPTIONS.length, blogs: blogs.length }}
                  />
                </div>
              </div>
            </div>

            <div className="grid shrink-0 grid-cols-4 gap-2 sm:gap-3">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-black/5 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                <ScoreRing score={averageScore} size={52} />
                <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Average</p>
              </div>
              <StatTile label="Ready" value={counts.ready} tone="emerald" />
              <StatTile label="Incomplete" value={counts.incomplete} tone="amber" />
              <StatTile label="Critical" value={counts.critical} tone="rose" />
            </div>
          </div>

          <div className="relative mt-5 flex min-h-[4.5rem] flex-col gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/[0.05] px-4 py-3 sm:flex-row sm:items-center">
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
                <ActionButton variant="secondary" onClick={() => { bulkStop.current = true }}>
                  Stop
                </ActionButton>
              </>
            ) : incompleteCount > 0 ? (
              <>
                <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 sm:flex">
                  <WandSparkles className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {incompleteCount} {scope === "pages" ? (incompleteCount === 1 ? "page" : "pages") : incompleteCount === 1 ? "post" : "posts"} not ready
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    AI drafts the missing titles, descriptions, keywords and social copy; URLs, images and Schema.org come from the page itself. Fields that already pass are kept.
                  </p>
                </div>
                <ActionButton variant="primary" icon={WandSparkles} onClick={() => setBulkConfirm(true)}>
                  Fix all with AI
                </ActionButton>
              </>
            ) : (
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                Every {scope === "pages" ? "page" : "blog post"} is ready for search and social.
              </p>
            )}
          </div>
        </div>
      </section>

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

      {/* Library | editor | live previews. Columns are capped (minmax 0), so long URLs and titles
          never widen them, and the library and previews stay put while the editor scrolls. */}
      <form
        onSubmit={save}
        className="grid items-start gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_19rem]"
      >
        <aside className={`${glass} flex max-h-[26rem] flex-col overflow-hidden lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7.5rem)]`}>
          <div className="border-b border-border/50 px-4 py-3">
            <SectionTitle
              icon={scope === "pages" ? Globe2 : FileText}
              title={scope === "pages" ? "Pages" : "Blog posts"}
              hint={scope === "pages" ? "Site pages with their own SEO" : `${filteredBlogs.length} of ${blogRows.length} shown`}
            />
          </div>
          {scope === "blogs" && (
            <div className="space-y-2 border-b border-border/50 p-3">
              <TableSearch value={query} onChange={setQuery} placeholder="Search title or slug…" label="Search blog posts" className="min-w-0" />
              <div role="tablist" aria-label="Filter posts by SEO status" className="grid grid-cols-4 gap-1 rounded-xl bg-muted/60 p-1">
                {([
                  ["all", "All", blogRows.length],
                  ["critical", "Critical", counts.critical],
                  ["incomplete", "Partial", counts.incomplete],
                  ["ready", "Ready", counts.ready],
                ] as const).map(([id, label, count]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === id}
                    onClick={() => setStatusFilter(id)}
                    className={`flex flex-col items-center rounded-lg py-1 text-[10px] font-bold transition ${
                      statusFilter === id ? "bg-white text-orange-700 shadow-sm dark:bg-zinc-900 dark:text-orange-300" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="text-sm font-black tabular-nums">{count}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {scope === "pages"
              ? pageRows.map((page) => (
                  <LibraryRow
                    key={page.key}
                    active={selectedPage === page.key}
                    onSelect={() => setSelectedPage(page.key)}
                    title={page.label}
                    subtitle={page.pathname}
                    score={page.score}
                    status={page.status}
                  />
                ))
              : filteredBlogs.length
                ? filteredBlogs.map(({ blog, score, status }) => (
                    <LibraryRow
                      key={blog.id}
                      active={selectedBlogId === blog.id}
                      onSelect={() => setSelectedBlogId(blog.id)}
                      title={blog.title}
                      subtitle={`/blog/${blog.slug}`}
                      score={score}
                      status={status}
                    />
                  ))
                : <p className="px-3 py-8 text-center text-sm text-muted-foreground">No posts match.</p>}
          </div>
        </aside>

        {/* The editor. Not overflow-hidden, so its Save bar can stick to the bottom of the screen. */}
        <div className={`${glass} min-w-0`}>
          <div className="flex flex-wrap items-center gap-4 border-b border-border/50 px-5 py-4">
            <ScoreRing score={currentScore} size={56} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-600 dark:text-orange-400">
                {scope === "pages" ? "Page" : "Blog post"} SEO
              </p>
              <h3 className="truncate text-lg font-black tracking-tight">{subjectLabel}</h3>
              <p className="truncate text-xs text-muted-foreground">{subjectUrl}</p>
            </div>
            <div className="flex shrink-0 gap-2" title="AI fills the editor; nothing is saved until you press Save SEO">
              <ActionButton variant="primary" onClick={() => void fillWithAi("missing")} disabled={busy || !currentSubject}>
                {aiBusy === "missing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Fill missing
              </ActionButton>
              <ActionButton variant="secondary" onClick={() => void fillWithAi("all")} disabled={busy || !currentSubject}>
                {aiBusy === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
                Rewrite all
              </ActionButton>
            </div>
          </div>

          <div className="divide-y divide-border/50">
            <Section icon={Search} title="Search result" hint="What people see on Google">
              <Field label="SEO title" count={workingSeo.title.trim().length} range={[30, 60]}>
                <Input value={draft.title} onChange={(e) => setField("title", e.target.value)} />
              </Field>
              <Field label="Meta description" count={workingSeo.description.trim().length} range={[120, 160]}>
                <Textarea value={draft.description} onChange={(e) => setField("description", e.target.value)} className={`${fixedText} h-24`} />
              </Field>
              <Field label="Keywords" hint={`${keywords.length} phrases`} ok={keywords.length >= 3}>
                <Textarea
                  value={keywordText}
                  onChange={(e) => setKeywordText(e.target.value)}
                  placeholder="pet nutrition, dog diet, cat wellness"
                  className={`${fixedText} h-20`}
                />
              </Field>
            </Section>

            <Section icon={Link2} title="Indexing" hint="Which URL counts, and whether search engines may index it">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Canonical URL">
                  <Input value={draft.canonicalUrl || ""} onChange={(e) => setField("canonicalUrl", e.target.value)} />
                </Field>
                <Field label="Robots">
                  <Input value={draft.robots || ""} onChange={(e) => setField("robots", e.target.value)} placeholder="index,follow" />
                </Field>
              </div>
              <Field label="Primary / fallback image">
                <Input value={draft.image || ""} onChange={(e) => setField("image", e.target.value)} placeholder="https://…" />
              </Field>
            </Section>

            <Section icon={Share2} title="Social cards" hint="How links look on WhatsApp, Facebook and X">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Open Graph title"><Input value={draft.ogTitle || ""} onChange={(e) => setField("ogTitle", e.target.value)} /></Field>
                <Field label="Twitter title"><Input value={draft.twitterTitle || ""} onChange={(e) => setField("twitterTitle", e.target.value)} /></Field>
                <Field label="Open Graph description">
                  <Textarea value={draft.ogDescription || ""} onChange={(e) => setField("ogDescription", e.target.value)} className={`${fixedText} h-24`} />
                </Field>
                <Field label="Twitter description">
                  <Textarea value={draft.twitterDescription || ""} onChange={(e) => setField("twitterDescription", e.target.value)} className={`${fixedText} h-24`} />
                </Field>
                <Field label="Open Graph image"><Input value={draft.ogImage || ""} onChange={(e) => setField("ogImage", e.target.value)} /></Field>
                <Field label="Twitter image"><Input value={draft.twitterImage || ""} onChange={(e) => setField("twitterImage", e.target.value)} /></Field>
              </div>
            </Section>

            <Section
              icon={Braces}
              title="Structured data"
              hint="Schema.org JSON-LD for rich results"
              right={
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                    schemaValidation.valid
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  }`}
                >
                  {schemaValidation.valid ? <ShieldCheck className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {schemaValidation.message}
                </span>
              }
            >
              <Textarea
                value={draft.schemaJson || ""}
                onChange={(e) => setField("schemaJson", e.target.value)}
                className={`${fixedText} h-64 font-mono text-xs`}
                placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "WebPage"\n}'}
              />
            </Section>
          </div>

          {/* Save bar: sticks to the bottom of the screen while the editor is in view */}
          <div className="sticky bottom-3 z-10 m-3 flex items-center gap-3 rounded-2xl border border-black/10 bg-white/90 px-4 py-3 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/90">
            {dirty ? (
              <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                <span className="truncate">Unsaved changes</span>
              </span>
            ) : (
              <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="truncate">All changes saved</span>
              </span>
            )}
            <ActionButton type="submit" variant="primary" disabled={saving || !dirty} className="ml-auto h-10 px-6">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save SEO
            </ActionButton>
          </div>
        </div>

        {/* Live previews: fixed heights, so typing never makes them grow and push things around */}
        <div className="grid gap-4 sm:grid-cols-2 lg:col-start-2 xl:sticky xl:top-24 xl:col-start-auto xl:grid-cols-1">
          <PreviewCard icon={Search} title="Google preview">
            <div className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-[11px] font-black text-orange-600">P</span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-xs font-semibold">Paw Sattva</p>
                <p className="truncate text-[11px] text-muted-foreground">{displayUrl}</p>
              </div>
            </div>
            <p className="mt-2 truncate text-lg font-medium text-blue-700 dark:text-blue-400">{workingSeo.title || "SEO title preview"}</p>
            <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-slate-600 dark:text-slate-400">
              {workingSeo.description || "Meta description preview."}
            </p>
          </PreviewCard>

          <PreviewCard icon={Share2} title="Social card">
            <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
              <div
                className="flex aspect-[1.91/1] items-center justify-center bg-gradient-to-br from-orange-100 to-amber-50 bg-cover bg-center text-orange-400 dark:from-orange-950/40 dark:to-amber-950/20"
                style={socialImage ? { backgroundImage: `url("${encodeURI(socialImage)}")` } : undefined}
              >
                {!socialImage && <ImageIcon className="h-8 w-8" />}
              </div>
              <div className="space-y-0.5 bg-black/[0.02] px-3 py-2 dark:bg-white/[0.03]">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">pawsattva.com</p>
                <p className="truncate text-sm font-bold">{workingSeo.ogTitle || workingSeo.title || "Open Graph title"}</p>
                <p className="line-clamp-2 min-h-8 text-xs leading-4 text-muted-foreground">
                  {workingSeo.ogDescription || workingSeo.description || "Open Graph description."}
                </p>
              </div>
            </div>
          </PreviewCard>

          <PreviewCard icon={ShieldCheck} title="Readiness" right={<span className="text-xs font-bold tabular-nums text-muted-foreground">{passed}/{checks.length} passed</span>}>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
              <div
                className={`h-full rounded-full transition-[width,background-color] duration-500 ${currentScore >= 90 ? "bg-emerald-500" : currentScore >= 60 ? "bg-amber-500" : "bg-rose-500"}`}
                style={{ width: `${currentScore}%` }}
              />
            </div>
            <div className="space-y-2">
              {checks.map((check) => (
                <Check key={check.label} label={check.label} ok={check.ok} />
              ))}
            </div>
          </PreviewCard>
        </div>
      </form>
    </div>
  )
}

const glass = "rounded-[1.75rem] border border-white/40 bg-white/60 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-black/40"
// Text areas keep their height as text is filled in (the shared Textarea grows with its content)
const fixedText = "field-sizing-fixed resize-none overflow-y-auto"

const SEO_KEYS = [
  "title", "description", "keywords", "canonicalUrl", "robots", "image", "ogTitle", "ogDescription", "ogImage",
  "twitterTitle", "twitterDescription", "twitterImage", "schemaJson",
] as const

/** The SEO fields alone, in a fixed order, to compare the editor with what's saved */
const seoSignature = (seo: SeoConfigFields) =>
  JSON.stringify(SEO_KEYS.map((key) => (key === "keywords" ? seo.keywords : seo[key] ?? "")))

function SeoSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading SEO command center">
      <div className="h-[15rem] animate-pulse rounded-[2rem] bg-gradient-to-br from-orange-500/15 via-amber-500/10 to-yellow-400/10" />
      <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_19rem]">
        <div className="h-[26rem] animate-pulse rounded-[1.75rem] bg-black/[0.04] dark:bg-white/[0.05]" />
        <div className="h-[40rem] animate-pulse rounded-[1.75rem] bg-black/[0.04] dark:bg-white/[0.05]" />
        <div className="hidden h-[30rem] animate-pulse rounded-[1.75rem] bg-black/[0.04] xl:block dark:bg-white/[0.05]" />
      </div>
    </div>
  )
}

function SectionTitle({ icon: Icon, title, hint, right }: { icon: LucideIcon; title: string; hint?: string; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 ring-1 ring-orange-500/15 dark:text-orange-300">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-black tracking-tight">{title}</h4>
        {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
      {right}
    </div>
  )
}

function Section({ icon, title, hint, right, children }: { icon: LucideIcon; title: string; hint?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4 px-5 py-5">
      <SectionTitle icon={icon} title={title} hint={hint} right={right} />
      {children}
    </section>
  )
}

function PreviewCard({ icon, title, right, children }: { icon: LucideIcon; title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className={`${glass} p-4`}>
      <div className="mb-3">
        <SectionTitle icon={icon} title={title} right={right} />
      </div>
      {children}
    </div>
  )
}

/**
 * A labelled field. With `range`, the counter shows length / max and a thin meter fills under the
 * input: green inside the range, amber outside it. Everything is a fixed size, so nothing shifts.
 */
function Field({
  label, hint, ok, count, range, children,
}: { label: string; hint?: string; ok?: boolean; count?: number; range?: [number, number]; children: ReactNode }) {
  const state = range && count !== undefined
    ? count === 0 ? "empty" : count >= range[0] && count <= range[1] ? "ok" : "warn"
    : ok === undefined ? "empty" : ok ? "ok" : "warn"
  const tone = state === "ok" ? "text-emerald-600 dark:text-emerald-400" : state === "warn" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
  return (
    <div className="space-y-2">
      <Label className="flex items-center justify-between gap-3">
        <span>{label}</span>
        {(hint || range) && <span className={`text-xs font-semibold tabular-nums ${tone}`}>{range ? `${count} / ${range[1]}` : hint}</span>}
      </Label>
      {children}
      {range && (
        <div className="h-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
          <div
            className={`h-full rounded-full transition-[width,background-color] duration-300 ${state === "ok" ? "bg-emerald-500" : state === "warn" ? "bg-amber-500" : "bg-transparent"}`}
            style={{ width: `${Math.min(100, ((count ?? 0) / range[1]) * 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

function LibraryRow({
  active, onSelect, title, subtitle, score, status,
}: { active: boolean; onSelect: () => void; title: string; subtitle: string; score: number; status: SeoReadinessStatus }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition ${
        active ? "bg-orange-500/10 ring-1 ring-orange-500/25" : "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
      }`}
    >
      <ScoreRing score={score} size={36} />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm font-bold ${active ? "text-orange-800 dark:text-orange-200" : ""}`}>{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
      </span>
      <span
        title={status}
        className={`h-2 w-2 shrink-0 rounded-full ${status === "ready" ? "bg-emerald-500" : status === "incomplete" ? "bg-amber-500" : "bg-rose-500"}`}
      />
    </button>
  )
}

/** The score as a ring that fills (and changes colour) as the SEO improves */
function ScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const stroke = size >= 50 ? 5 : 3.5
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const color = score >= 90 ? "text-emerald-500" : score >= 60 ? "text-amber-500" : "text-rose-500"
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`SEO score ${score}%`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-black/[0.07] dark:stroke-white/10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          className={`${color} transition-[stroke-dashoffset] duration-700 ease-out`}
        />
      </svg>
      <span className={`absolute font-black tabular-nums ${size >= 50 ? "text-sm" : "text-[10px]"}`}>{score}</span>
    </span>
  )
}

function Check({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />}
      <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
    </div>
  )
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: "emerald" | "amber" | "rose" }) {
  const style = tone === "emerald"
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : tone === "amber"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
  const Icon = tone === "emerald" ? CheckCircle2 : AlertTriangle
  return (
    <div className="flex min-w-[4.75rem] flex-col items-center justify-center rounded-2xl border border-black/5 bg-white/70 p-3 transition-transform hover:scale-[1.03] dark:border-white/10 dark:bg-white/[0.04]">
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${style}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-1 text-2xl font-black tabular-nums leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  )
}
