"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, BookOpen, Clock, ExternalLink, X } from "lucide-react"

import { formatBlogDate } from "@/app/(main)/blog/blog-summary"
import { articleBlocks, type ArticleBlock, type QuickRead } from "./quick-reads"

export interface ReadsPanelContent {
  question: string
  /** false: nothing matched, so these are the newest posts, not related ones */
  related: boolean
  reads: QuickRead[]
}

/**
 * Reading panel (laptops and up): half the screen, beside the chat, like an artifact. Opens when
 * an answer is slow with blog posts related to the question; a post opens in full right here.
 * It stays until the person closes it. A new slow question refreshes the list, but never
 * replaces the article they are reading.
 */
export function ReadsPanel({
  content,
  waiting,
  onClose,
}: {
  content: ReadsPanelContent
  /** Paw GPT hasn't started answering yet */
  waiting: boolean
  onClose: () => void
}) {
  const [open, setOpen] = useState<QuickRead | null>(null)
  const question = content.question.length > 90 ? `${content.question.slice(0, 89).trimEnd()}…` : content.question

  return (
    <aside
      aria-label="Reading panel"
      className="fixed bottom-4 right-4 top-[calc(5.5rem+env(safe-area-inset-top))] z-20 hidden w-[calc(50vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-[0_24px_60px_-24px_rgba(24,24,27,0.25)] duration-300 animate-in fade-in slide-in-from-right-8 lg:flex"
    >
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
        {open ? (
          <button
            type="button"
            onClick={() => setOpen(null)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> All reads
          </button>
        ) : (
          <span className="flex min-w-0 items-center gap-2 px-1.5">
            <BookOpen className="h-4 w-4 shrink-0 text-orange-500" />
            <span className="text-sm font-bold">{content.related ? "Related reads" : "Popular reads"}</span>
          </span>
        )}
        <span
          className={`ml-auto rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            waiting ? "paw-gpt-anim-shimmer bg-orange-500/10 text-orange-700 dark:text-orange-300" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {waiting ? "Paw GPT is thinking…" : "Answer ready"}
        </span>
        {open && (
          <Link
            href={`/blog/${open.slug}`}
            target="_blank"
            rel="noopener"
            aria-label="Open article in a new tab"
            title="Open in a new tab"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close reading panel"
          title="Close"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {open ? (
          <Article read={open} />
        ) : (
          <div className="mx-auto max-w-2xl px-5 py-4">
            {content.related && (
              <p className="mb-3 text-xs text-muted-foreground">
                For “<span className="font-medium text-foreground/80">{question}</span>”
              </p>
            )}
            <ul className="divide-y divide-border">
              {content.reads.map((read) => (
                <li key={read.id}>
                  <button type="button" onClick={() => setOpen(read)} className="group flex w-full gap-4 py-3.5 text-left">
                    <span className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
                      <Image src={read.image} alt="" fill sizes="112px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 font-semibold leading-snug group-hover:text-orange-700 dark:group-hover:text-orange-300">
                        {read.title}
                      </span>
                      <span className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground">{read.excerpt}</span>
                      <span className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {read.readMinutes} min read
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  )
}

/** The whole post, as clean text: headings, paragraphs, lists and quotes. */
function Article({ read }: { read: QuickRead }) {
  const blocks = useMemo(() => articleBlocks(read.html), [read.html])
  return (
    <article key={read.id} className="mx-auto max-w-2xl px-6 pb-10 pt-5">
      <div className="relative aspect-[2/1] w-full overflow-hidden rounded-xl bg-muted">
        <Image src={read.image} alt="" fill sizes="50vw" className="object-cover" />
      </div>
      <h2 className="mt-5 text-2xl font-black leading-tight tracking-tight">{read.title}</h2>
      <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
        <span>{read.authorName}</span>
        {read.date && <span>· {formatBlogDate(read.date)}</span>}
        <span className="inline-flex items-center gap-1">
          · <Clock className="h-3 w-3" /> {read.readMinutes} min read
        </span>
      </p>
      {read.excerpt && <p className="mt-4 text-[15px] font-medium leading-relaxed text-foreground/80">{read.excerpt}</p>}
      <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-foreground/85">
        {(blocks.length ? groupItems(blocks) : [[{ type: "paragraph" as const, text: read.preview }]]).map((group, index) =>
          group[0].type === "item" ? (
            <ul key={index} className="list-disc space-y-1.5 pl-5 marker:text-orange-500">
              {group.map((block, i) => (
                <li key={i}>{block.text}</li>
              ))}
            </ul>
          ) : group[0].type === "heading" ? (
            <h3 key={index} className="pt-3 text-lg font-bold tracking-tight text-foreground">
              {group[0].text}
            </h3>
          ) : group[0].type === "quote" ? (
            <blockquote key={index} className="border-l-2 border-orange-400 pl-4 italic text-foreground/75">
              {group[0].text}
            </blockquote>
          ) : (
            <p key={index}>{group[0].text}</p>
          )
        )}
      </div>
      <Link
        href={`/blog/${read.slug}`}
        target="_blank"
        rel="noopener"
        className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:underline"
      >
        Open on the blog <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </article>
  )
}

/** Consecutive list items become one list; everything else stays one block per group. */
function groupItems(blocks: ArticleBlock[]) {
  const groups: ArticleBlock[][] = []
  for (const block of blocks) {
    const last = groups.at(-1)
    if (block.type === "item" && last?.[0].type === "item") last.push(block)
    else groups.push([block])
  }
  return groups
}
