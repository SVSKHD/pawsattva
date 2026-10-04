"use client"

import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { ShimmerImage } from "@/components/shimmer-image"
import Link from "next/link"
import { ArrowRight, ArrowUpRight, Clock, Eye, MessageCircle, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { BlogReactions } from "@/components/blog-reactions"
import { formatBlogDate, type BlogSummary } from "./blog-summary"

export interface BlogCategoryOption {
  id: string
  name: string
  parentId?: string
  description?: string
}

type SortKey = "latest" | "popular"

// Cards rendered per step: small enough for a fast first paint, refilled before the reader reaches the end
const BATCH = 6

interface BlogExplorerProps {
  posts: BlogSummary[]
  categories: BlogCategoryOption[]
}

export function BlogExplorer({ posts, categories }: BlogExplorerProps) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [sort, setSort] = useState<SortKey>("latest")
  const [visible, setVisible] = useState(BATCH)
  const [, startTransition] = useTransition()
  const deferredQuery = useDeferredValue(query)
  const sentinelRef = useRef<HTMLDivElement>(null)
  // Set together with the restored filters, so URL syncing never runs on the pre-restore defaults
  const [urlReady, setUrlReady] = useState(false)

  // Restore ?q= / ?category= / ?sort= once on load (keeps the page statically rendered)
  useEffect(() => {
    // One-time sync from the URL after hydration; reading it during render would mismatch the server HTML
    const params = new URLSearchParams(window.location.search)
    const q = params.get("q")
    const cat = params.get("category")
    const s = params.get("sort")
    if (q) setQuery(q)
    if (cat && categories.some((c) => c.id === cat)) setCategory(cat)
    if (s === "popular") setSort("popular")
    setUrlReady(true)
  }, [categories])

  // Mirror filters into the URL so results are shareable and survive back/forward
  useEffect(() => {
    if (!urlReady) return
    const params = new URLSearchParams()
    if (deferredQuery.trim()) params.set("q", deferredQuery.trim())
    if (category !== "all") params.set("category", category)
    if (sort !== "latest") params.set("sort", sort)
    const search = params.toString()
    const next = `${window.location.pathname}${search ? `?${search}` : ""}`
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, "", next)
  }, [urlReady, deferredQuery, category, sort])

  // GA4's recommended "search" event, once the visitor pauses typing (not on every keystroke)
  useEffect(() => {
    const term = deferredQuery.trim()
    if (term.length < 3) return
    const timer = window.setTimeout(() => {
      void import("@/firebase/analytics").then(({ trackEvent }) => trackEvent("search", { search_term: term, area: "blog" }))
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [deferredQuery])

  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const parents = useMemo(() => categories.filter((c) => !c.parentId), [categories])
  const selected = byId.get(category)
  const activeParentId = selected?.parentId || selected?.id || "all"
  const subs = useMemo(() => categories.filter((c) => c.parentId === activeParentId), [categories, activeParentId])

  // Only categories that actually have posts are worth a chip
  const postCountByCategory = useMemo(() => {
    const counts = new Map<string, number>()
    for (const post of posts) {
      const ids = new Set<string>()
      for (const id of post.categoryIds) {
        ids.add(id)
        const parent = byId.get(id)?.parentId
        if (parent) ids.add(parent)
      }
      ids.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1))
    }
    return counts
  }, [posts, byId])

  const results = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    const filtered = posts.filter((post) => {
      const inCategory =
        category === "all" ||
        post.categoryIds.includes(category) ||
        post.categoryIds.some((id) => byId.get(id)?.parentId === category)
      const matches = !q || q.split(/\s+/).every((word) => post.searchText.includes(word))
      return inCategory && matches
    })
    return sort === "popular" ? [...filtered].sort((a, b) => b.views + b.likes * 5 - (a.views + a.likes * 5)) : filtered
  }, [posts, deferredQuery, category, sort, byId])

  const isFiltered = category !== "all" || deferredQuery.trim() !== "" || sort !== "latest"
  // Unfiltered: the top 3 get the spotlight, the grid shows the rest
  const spotlight = isFiltered ? [] : results.slice(0, 3)
  const gridPosts = isFiltered ? results : results.slice(3)
  const shown = gridPosts.slice(0, visible)
  const hasMore = visible < gridPosts.length

  const applyFilter = (update: () => void) => {
    startTransition(() => {
      update()
      setVisible(BATCH)
    })
  }

  // Load the next batch shortly before the end of the list comes into view
  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setVisible((count) => count + BATCH)
      },
      { rootMargin: "600px 0px" }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, visible])

  const categoryName = (id: string) => byId.get(id)?.name

  return (
    <div className="container mx-auto max-w-7xl px-4">
      {/* Spotlight: newest post large, next two stacked */}
      {spotlight.length > 0 && (
        <section aria-label="Latest posts" className="mb-14 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <FeaturedCard post={spotlight[0]} categoryName={categoryName(spotlight[0].categoryIds[0])} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            {spotlight.slice(1).map((post) => (
              <CompactCard key={post.id} post={post} categoryName={categoryName(post.categoryIds[0])} />
            ))}
          </div>
        </section>
      )}

      {/* Filter bar */}
      <section aria-label="Filter articles" className="mb-8 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="-mx-4 flex flex-1 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0 [&::-webkit-scrollbar]:hidden">
            <Chip active={activeParentId === "all"} onClick={() => applyFilter(() => setCategory("all"))}>
              All <span className="opacity-60">{posts.length}</span>
            </Chip>
            {parents
              .filter((c) => postCountByCategory.get(c.id))
              .map((c) => (
                <Chip key={c.id} active={activeParentId === c.id} onClick={() => applyFilter(() => setCategory(c.id))}>
                  {c.name} <span className="opacity-60">{postCountByCategory.get(c.id)}</span>
                </Chip>
              ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-72 md:flex-none">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setVisible(BATCH)
                }}
                placeholder="Search articles…"
                aria-label="Search articles"
                className="h-11 w-full rounded-full border border-border bg-background pl-10 pr-10 text-sm font-medium outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <select
              value={sort}
              onChange={(e) => applyFilter(() => setSort(e.target.value as SortKey))}
              aria-label="Sort articles"
              className="h-11 rounded-full border border-border bg-background px-4 text-sm font-semibold outline-none focus:border-orange-400"
            >
              <option value="latest">Latest</option>
              <option value="popular">Most read</option>
            </select>
          </div>
        </div>

        {subs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Chip small active={category === activeParentId} onClick={() => applyFilter(() => setCategory(activeParentId))}>
              All in {byId.get(activeParentId)?.name}
            </Chip>
            {subs
              .filter((s) => postCountByCategory.get(s.id))
              .map((s) => (
                <Chip key={s.id} small active={category === s.id} onClick={() => applyFilter(() => setCategory(s.id))}>
                  {s.name}
                </Chip>
              ))}
          </div>
        )}

        {isFiltered && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="text-muted-foreground">
              <strong className="text-foreground">{results.length}</strong> {results.length === 1 ? "article" : "articles"}
              {selected && <> in <strong className="text-foreground">{selected.name}</strong></>}
              {deferredQuery.trim() && <> for “<strong className="text-foreground">{deferredQuery.trim()}</strong>”</>}
            </p>
            <button
              type="button"
              onClick={() => applyFilter(() => { setCategory("all"); setQuery(""); setSort("latest") })}
              className="font-semibold text-orange-600 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
        {selected?.description && (
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{selected.description}</p>
        )}
      </section>

      {/* Grid */}
      {shown.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((post, index) => (
            <PostCard
              key={post.id}
              post={post}
              categoryName={categoryName(post.categoryIds[0])}
              // First row is above the fold when filtered — load those images eagerly
              eager={isFiltered && index < 3}
            />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center">
          <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10 text-orange-600">
            <Search className="h-7 w-7" />
          </span>
          <h3 className="text-xl font-bold">No articles found</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">Try a different word, or browse another topic.</p>
          <Button
            variant="outline"
            className="mt-6 rounded-full px-6"
            onClick={() => applyFilter(() => { setCategory("all"); setQuery(""); setSort("latest") })}
          >
            Show all articles
          </Button>
        </div>
      ) : null}

      {/* Infinite scroll sentinel: placeholder cards in the shape of the next row, plus a manual fallback */}
      {hasMore && (
        <div ref={sentinelRef} className="mt-6">
          <div aria-hidden className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard className="hidden sm:flex" />
            <SkeletonCard className="hidden lg:flex" />
          </div>
          <div className="mt-8 flex justify-center">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-6"
              onClick={() => setVisible((count) => count + BATCH)}
            >
              Show more ({gridPosts.length - visible} left)
            </Button>
          </div>
        </div>
      )}
      {!hasMore && gridPosts.length > BATCH && (
        <p className="mt-10 text-center text-sm text-muted-foreground">You&apos;ve reached the end — that&apos;s every article.</p>
      )}
    </div>
  )
}

/** Same footprint as PostCard, so the grid doesn't jump when the real cards replace it */
function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col overflow-hidden rounded-[1.75rem] border bg-card ${className}`}>
      <div className="image-shimmer aspect-[16/10]" />
      <div className="space-y-3 p-5">
        <div className="image-shimmer h-5 w-4/5 rounded-full" />
        <div className="image-shimmer h-3.5 w-full rounded-full" />
        <div className="image-shimmer h-3.5 w-2/3 rounded-full" />
        <div className="flex gap-2 border-t pt-4">
          <div className="image-shimmer h-6 w-14 rounded-full" />
          <div className="image-shimmer h-6 w-14 rounded-full" />
        </div>
      </div>
    </div>
  )
}

function Chip({
  active, onClick, small, children,
}: { active: boolean; onClick: () => void; small?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border font-semibold transition ${
        small ? "px-3.5 py-1.5 text-xs" : "px-4 py-2 text-sm"
      } ${
        active
          ? "border-orange-500 bg-orange-500 text-white shadow-sm shadow-orange-500/25"
          : "border-border bg-background text-muted-foreground hover:border-orange-300 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  )
}

function Meta({ post, light }: { post: BlogSummary; light?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium ${light ? "text-white/80" : "text-muted-foreground"}`}>
      {post.date && <span>{formatBlogDate(post.date)}</span>}
      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {post.readMinutes} min</span>
      {post.views > 0 && <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {post.views.toLocaleString("en-IN")}</span>}
    </div>
  )
}

/**
 * Like / dislike counters plus a comments link straight to the discussion. They sit above the
 * card's stretched link, so reacting never opens the post by accident.
 */
function Reactions({ post }: { post: BlogSummary }) {
  return (
    <div className="flex items-center gap-0.5">
      <BlogReactions blogId={post.id} initialLikes={post.likes} initialDislikes={post.dislikes} variant="compact" />
      <Link
        href={`/blog/${post.slug}#comments`}
        aria-label={post.comments ? `${post.comments} comments` : "Add a comment"}
        title={post.comments ? "Read the comments" : "Be the first to comment"}
        className="relative z-10 inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs font-semibold tabular-nums text-muted-foreground transition hover:bg-orange-500/10 hover:text-orange-700 dark:hover:text-orange-300"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        {post.comments.toLocaleString("en-IN")}
      </Link>
    </div>
  )
}

function CategoryTag({ name, onImage }: { name?: string; onImage?: boolean }) {
  if (!name) return null
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
        onImage ? "bg-white/90 text-zinc-900 backdrop-blur dark:bg-black/70 dark:text-white" : "bg-orange-500/10 text-orange-700 dark:text-orange-300"
      }`}
    >
      {name}
    </span>
  )
}

// Cards are <article>s whose title link is stretched over the whole card (after:absolute inset-0),
// so the reaction buttons can sit on top without nesting buttons inside a link.
const STRETCHED_LINK = "after:absolute after:inset-0 after:z-0 after:content-[''] focus-visible:outline-none"

function FeaturedCard({ post, categoryName }: { post: BlogSummary; categoryName?: string }) {
  return (
    <article className="group relative min-h-[380px] overflow-hidden rounded-[2rem] bg-zinc-900 focus-within:ring-4 focus-within:ring-orange-500/30 lg:min-h-[460px]">
      <ShimmerImage
        src={post.image}
        alt=""
        fill
        priority
        sizes="(max-width: 1024px) 100vw, 60vw"
        className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-9">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">Latest</span>
          <CategoryTag name={categoryName} onImage />
        </div>
        <h2 className="max-w-2xl text-balance text-2xl font-extrabold leading-tight text-white sm:text-4xl">
          <Link href={`/blog/${post.slug}`} className={STRETCHED_LINK}>{post.title}</Link>
        </h2>
        <p className="mt-3 line-clamp-2 max-w-xl text-sm text-white/80 sm:text-base">{post.excerpt}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Meta post={post} light />
            <div className="relative z-10 rounded-full bg-white/95 px-0.5 dark:bg-zinc-900/95">
              <Reactions post={post} />
            </div>
          </div>
          <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-zinc-900 transition-transform duration-500 group-hover:rotate-45 sm:flex">
            <ArrowUpRight className="h-5 w-5" />
          </span>
        </div>
      </div>
    </article>
  )
}

function CompactCard({ post, categoryName }: { post: BlogSummary; categoryName?: string }) {
  return (
    <article className="group relative flex gap-4 rounded-[1.5rem] border bg-card p-3 transition focus-within:ring-4 focus-within:ring-orange-500/20 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-950/5 dark:hover:border-orange-900 lg:h-full">
      <div className="relative aspect-square w-28 shrink-0 overflow-hidden rounded-2xl sm:w-32 lg:w-36">
        <ShimmerImage src={post.image} alt="" fill sizes="144px" priority className="object-cover transition-transform duration-500 group-hover:scale-105" />
      </div>
      <div className="flex min-w-0 flex-col py-1">
        <CategoryTag name={categoryName} />
        <h3 className="mt-2 line-clamp-3 font-bold leading-snug group-hover:text-orange-700 dark:group-hover:text-orange-300">
          <Link href={`/blog/${post.slug}`} className={STRETCHED_LINK}>{post.title}</Link>
        </h3>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-2">
          <Meta post={post} />
          <Reactions post={post} />
        </div>
      </div>
    </article>
  )
}

function PostCard({ post, categoryName, eager }: { post: BlogSummary; categoryName?: string; eager?: boolean }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[1.75rem] border bg-card transition duration-300 focus-within:ring-4 focus-within:ring-orange-500/20 hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-950/5 dark:hover:border-orange-900">
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <ShimmerImage
          src={post.image}
          alt=""
          caption={post.title}
          fill
          loading={eager ? "eager" : "lazy"}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3"><CategoryTag name={categoryName} onImage /></div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-lg font-bold leading-snug group-hover:text-orange-700 dark:group-hover:text-orange-300">
          <Link href={`/blog/${post.slug}`} className={STRETCHED_LINK}>{post.title}</Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{post.excerpt}</p>
        <div className="mt-auto pt-4">
          <Meta post={post} />
          <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
            <Reactions post={post} />
            <ArrowRight className="h-4 w-4 shrink-0 text-orange-500 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </article>
  )
}
