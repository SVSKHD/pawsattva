"use client"

import { useMemo, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { AlertTriangle, Bot, ImageIcon, RefreshCw, Search, Sparkles, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { Category } from "@/firebase/firestore"
import { publishBlockers } from "@/lib/ai-drafts/readiness"
import { AI_DRAFT_PENDING_STATUSES, type AiBlogDraft, type AiDraftStatus } from "@/lib/ai-drafts/types"
import { cn } from "@/lib/utils"
import { AiDraftReview } from "./AiDraftReview"
import { AiDraftStatusBadge, toDate } from "./AiDraftStatus"

type Filter = "pending" | "approved" | "changes_requested" | "rejected" | "published" | "all"

const FILTERS: { id: Filter; label: string; statuses?: readonly AiDraftStatus[] }[] = [
  { id: "pending", label: "Needs review", statuses: AI_DRAFT_PENDING_STATUSES },
  { id: "approved", label: "Approved", statuses: ["approved"] },
  { id: "changes_requested", label: "Changes requested", statuses: ["changes_requested"] },
  { id: "rejected", label: "Rejected", statuses: ["rejected"] },
  { id: "published", label: "Published", statuses: ["published"] },
  { id: "all", label: "All" },
]

interface AiDraftsTabProps {
  drafts: AiBlogDraft[]
  loading: boolean
  error: string | null
  onRetry: () => void
  categories: Category[]
}

export function AiDraftsTab({ drafts, loading, error, onRetry, categories }: AiDraftsTabProps) {
  const [filter, setFilter] = useState<Filter>("pending")
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = drafts.find((draft) => draft.id === selectedId) ?? null

  const counts = useMemo(() => Object.fromEntries(
    FILTERS.map(({ id, statuses }) => [id, statuses ? drafts.filter((draft) => statuses.includes(draft.status)).length : drafts.length])
  ) as Record<Filter, number>, [drafts])

  const rows = useMemo(() => {
    const statuses = FILTERS.find((entry) => entry.id === filter)?.statuses
    const query = search.trim().toLowerCase()
    return drafts
      .filter((draft) => !statuses || statuses.includes(draft.status))
      .filter((draft) => !query || [draft.title, draft.excerpt, ...(draft.keywords ?? [])].some((value) => value?.toLowerCase().includes(query)))
  }, [drafts, filter, search])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl sm:text-2xl font-bold">
            <Sparkles className="h-5 w-5 text-orange-500" /> AI drafts
          </h2>
          <p className="mt-0.5 max-w-xl text-xs sm:text-sm text-muted-foreground">
            Articles submitted by the ChatGPT integration. Nothing here is public until an admin approves and publishes it.
          </p>
        </div>
        {counts.pending > 0 && (
          <span className="rounded-full bg-sky-500 px-2.5 py-1 text-xs font-bold text-white">{counts.pending} awaiting review</span>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 shadow-sm backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/50 p-3">
          <div role="tablist" aria-label="Filter by status" className="flex max-w-full items-center overflow-x-auto rounded-xl bg-muted/60 p-1 [scrollbar-width:none]">
            {FILTERS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={filter === id}
                onClick={() => setFilter(id)}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition",
                  filter === id ? "bg-white text-foreground shadow-sm dark:bg-zinc-900" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
                <span className={cn("tabular-nums text-[10px]", id === "pending" && counts.pending > 0 ? "rounded-full bg-sky-500 px-1.5 text-white" : "text-muted-foreground")}>
                  {counts[id]}
                </span>
              </button>
            ))}
          </div>
          <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search drafts…"
              aria-label="Search drafts"
              className="h-9 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/30 pl-9 pr-8 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {error ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600"><AlertTriangle className="h-6 w-6" /></span>
            <p className="text-sm font-semibold">{error}</p>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={onRetry}><RefreshCw className="h-4 w-4" /> Try again</Button>
          </div>
        ) : loading ? (
          <div className="grid gap-3 p-3 lg:grid-cols-2">
            {[0, 1, 2, 3].map((key) => (
              <div key={key} className="flex gap-3 rounded-2xl border border-border/40 p-3">
                <Skeleton className="h-20 w-28 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-full" /><Skeleton className="h-3 w-2/3" /></div>
              </div>
            ))}
          </div>
        ) : rows.length ? (
          <ul className="grid gap-3 p-3 lg:grid-cols-2">
            {rows.map((draft) => <DraftCard key={draft.id} draft={draft} onOpen={() => setSelectedId(draft.id)} />)}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600"><Bot className="h-6 w-6" /></span>
            {search ? (
              <>
                <p className="text-sm font-semibold">No drafts match “{search}”</p>
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setSearch("")}>Clear search</Button>
              </>
            ) : drafts.length === 0 ? (
              <>
                <p className="text-sm font-semibold">No AI drafts yet</p>
                <p className="max-w-sm text-xs text-muted-foreground">Drafts sent by the ChatGPT action to /api/integrations/ai/blog-drafts appear here automatically.</p>
              </>
            ) : (
              <p className="text-sm font-semibold">{filter === "pending" ? "Nothing waiting for review" : "No drafts with this status"}</p>
            )}
          </div>
        )}
      </div>

      <AiDraftReview
        draft={selected}
        open={selectedId !== null}
        onOpenChange={(open) => !open && setSelectedId(null)}
        categories={categories}
      />
    </div>
  )
}

function DraftCard({ draft, onOpen }: { draft: AiBlogDraft; onOpen: () => void }) {
  const createdAt = toDate(draft.createdAt)
  const blockers = draft.status === "approved" ? publishBlockers(draft) : []
  const [imageFailed, setImageFailed] = useState(false)
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full gap-3 rounded-2xl border border-border/50 bg-white/50 p-3 text-left transition hover:border-orange-300 hover:bg-orange-500/[0.03] dark:bg-white/[0.02]"
      >
        <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-muted">
          {draft.image && !imageFailed ? (
            // eslint-disable-next-line @next/next/no-img-element -- AI images may come from hosts next/image doesn't allow
            <img src={draft.image} alt="" referrerPolicy="no-referrer" loading="lazy" onError={() => setImageFailed(true)} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-muted-foreground"><ImageIcon className="h-6 w-6 opacity-40" /></span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <AiDraftStatusBadge status={draft.status} />
            {createdAt && <span className="text-[11px] text-muted-foreground">{formatDistanceToNow(createdAt, { addSuffix: true })}</span>}
          </div>
          <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug group-hover:text-orange-700 dark:group-hover:text-orange-300">{draft.title}</p>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{draft.excerpt}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {(draft.keywords ?? []).slice(0, 3).map((keyword) => (
              <span key={keyword} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">{keyword}</span>
            ))}
            {blockers.length > 0 && (
              <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                {blockers.length} to fix before publishing
              </span>
            )}
          </div>
        </div>
      </button>
    </li>
  )
}
