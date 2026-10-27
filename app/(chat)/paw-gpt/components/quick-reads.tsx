"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore"
import { BookOpen, Clock, ExternalLink, Loader2, Square, Volume2 } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { db } from "@/firebase/db"
import type { Blog } from "@/firebase/firestore"
import { clip, formatBlogDate, toBlogSummary, toPlainText, type BlogSummary } from "@/app/(main)/blog/blog-summary"
import { useReadAloud } from "./read-aloud"

export interface QuickRead extends BlogSummary {
  /** The article's opening as plain text (never rendered as HTML here) */
  preview: string
  /** The article body's HTML, read into text blocks by articleBlocks() when opened (never rendered as HTML) */
  html: string
}

export type ArticleBlock = { type: "heading" | "paragraph" | "item" | "quote"; text: string }

/**
 * Article HTML → headings, paragraphs, list items and quotes as plain text, for the reading
 * panel. DOMParser doesn't run scripts or load images, and only textContent is kept, so the
 * post's markup is never injected into the page.
 */
export function articleBlocks(html: string): ArticleBlock[] {
  if (typeof DOMParser === "undefined" || !html) return []
  const doc = new DOMParser().parseFromString(html, "text/html")
  const blocks: ArticleBlock[] = []
  for (const el of doc.body.querySelectorAll("h1, h2, h3, h4, h5, h6, p, li, blockquote")) {
    // Paragraphs inside a list item or quote are read as part of it.
    if (el.tagName === "P" && el.parentElement?.closest("li, blockquote")) continue
    const text = el.textContent?.replace(/\s+/g, " ").trim()
    if (!text) continue
    const type = /^H\d$/.test(el.tagName) ? "heading" : el.tagName === "LI" ? "item" : el.tagName === "BLOCKQUOTE" ? "quote" : "paragraph"
    blocks.push({ type, text })
  }
  // Posts written as bare text with line breaks: fall back to paragraphs.
  if (!blocks.length) {
    for (const text of (doc.body.textContent ?? "").split(/\n{2,}/).map((part) => part.replace(/\s+/g, " ").trim())) {
      if (text) blocks.push({ type: "paragraph", text })
    }
  }
  return blocks
}

/** "Read aloud" for a post: title, summary and the whole article, in the same voice as answers. */
export function ReadAloudButton({ read, className = "" }: { read: QuickRead; className?: string }) {
  const { user } = useAuth()
  const text = useMemo(() => {
    const blocks = articleBlocks(read.html)
    const body = blocks.length ? blocks.map((block) => block.text) : [read.preview]
    return [read.title, read.excerpt, ...body].filter(Boolean).join("\n\n")
  }, [read])
  const readAloud = useReadAloud(`read:${read.id}`, text, user)
  if (!readAloud.available) return null
  return (
    <button
      type="button"
      onClick={readAloud.toggle}
      aria-pressed={readAloud.status !== "idle"}
      className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold transition hover:bg-muted ${
        readAloud.status !== "idle" ? "text-orange-700 dark:text-orange-300" : "text-muted-foreground hover:text-foreground"
      } ${className}`}
    >
      {readAloud.status === "loading" ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : readAloud.status === "speaking" ? (
        <Square className="h-3.5 w-3.5 fill-current" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
      {readAloud.status === "loading" ? "Preparing…" : readAloud.status === "speaking" ? "Stop" : "Read aloud"}
    </button>
  )
}

// Enough to cover the whole library for matching and reading in the panel.
const RECENT_POSTS = 80
let cache: Promise<QuickRead[]> | null = null

/** Recent published posts, fetched once per visit and only when first needed. */
function loadQuickReads() {
  cache ??= getDocs(query(collection(db, "blogs"), orderBy("date", "desc"), limit(RECENT_POSTS)))
    .then((snapshot) =>
      snapshot.docs
        .map((entry) => {
          const data = entry.data()
          const blog = {
            id: entry.id,
            ...data,
            date: data.date?.toDate ? data.date.toDate().toISOString().split("T")[0] : data.date,
          } as Blog
          return blog
        })
        .filter((blog) => blog.status === "published" && blog.slug)
        .map((blog) => ({ ...toBlogSummary(blog), preview: clip(toPlainText(blog.content || ""), 700), html: blog.content || "" }))
    )
    .catch((error) => {
      console.error("Paw GPT: could not load quick reads:", error)
      cache = null
      return []
    })
  return cache
}

/** Loads the posts the first time `enabled` becomes true. */
export function useQuickReads(enabled: boolean) {
  const [reads, setReads] = useState<QuickRead[]>([])
  useEffect(() => {
    if (!enabled || reads.length) return
    let active = true
    void loadQuickReads().then((posts) => {
      if (active) setReads(posts)
    })
    return () => {
      active = false
    }
  }, [enabled, reads.length])
  return reads
}

const STOP_WORDS = new Set([
  "what", "when", "which", "with", "should", "could", "would", "about", "there", "their", "they", "this", "that",
  "have", "does", "from", "your", "much", "many", "give", "tell", "make", "best", "each", "every", "daily", "need",
  "needs", "times", "time", "week", "weeks", "month", "months", "year", "years", "good", "okay", "help", "please",
  "know", "want", "like", "some", "more", "less", "than", "into", "just", "also", "very", "really", "pet", "pets",
])

// Everyday wording → words articles actually use ("eat" → feed / food / diet …).
const TOPICS: [RegExp, string[]][] = [
  [/\b(eat|eats|ate|food|feed|feeding|diet|meal|meals|portion|kibble|treat|treats|nutrition|hungry)\b/, ["feed", "food", "diet", "nutrition", "meal", "treat"]],
  [/\b(groom|grooming|bath|bathe|brush|coat|hair|shed|shedding|fur|nail|nails)\b/, ["groom", "bath", "coat", "hair", "brush", "shed"]],
  [/\b(weight|fat|obese|overweight|thin|skinny)\b/, ["weight", "obes", "body condition"]],
  [/\b(water|drink|drinking|hydrat)/, ["water", "hydrat"]],
  [/\b(walk|walks|exercise|play|energy|active)\b/, ["walk", "exercise", "play", "activ"]],
  [/\b(sick|ill|unwell|vomit|vomiting|diarrh|symptom|symptoms|vet|fever|scratch|itch)/, ["sick", "unwell", "signs", "health", "vet", "symptom"]],
  [/\b(heat|summer|hot)\b/, ["heat", "summer"]],
  [/\b(puppy|puppies|kitten|kittens)\b/, ["puppy", "puppies", "kitten"]],
  [/\b(adopt|adoption|new pet|breed|breeds|which dog|which cat)\b/, ["adopt", "breed", "guide"]],
  [/\b(travel|trip|flight|car ride|holiday)\b/, ["travel", "trip"]],
  [/\b(cold|winter|rain|monsoon)\b/, ["winter", "cold", "monsoon"]],
  [/\b(ear|ears|eye|eyes|teeth|dental|paw|paws)\b/, ["ear", "eye", "teeth", "dental", "paw"]],
  [/\b(stray|street|community dog)/, ["stray", "community"]],
]

/** Posts ranked for the question: its words (more when they're in the title), topic and pet kind. */
function rankReads(reads: QuickRead[], question: string, petKind: "dog" | "cat" | null) {
  const text = question.toLowerCase()
  const words = (text.match(/[a-z]{4,}/g) ?? []).filter((word) => !STOP_WORDS.has(word))
  const topicWords = TOPICS.filter(([pattern]) => pattern.test(text)).flatMap(([, related]) => related)
  // Species named in the question beat the selected pet (a guest asking about cats).
  const kind = /\b(cat|cats|kitten|kittens)\b/.test(text) ? "cat" : /\b(dog|dogs|puppy|puppies)\b/.test(text) ? "dog" : petKind
  return reads
    .map((read, index) => {
      const title = read.title.toLowerCase()
      let relevance = 0
      for (const word of words) {
        const stem = word.replace(/s$/, "")
        if (title.includes(stem)) relevance += 4
        else if (read.searchText.includes(stem)) relevance += 2
      }
      for (const word of topicWords) if (read.searchText.includes(word)) relevance += title.includes(word) ? 4 : 3
      let score = relevance
      if (kind) {
        const other = kind === "dog" ? "cat" : "dog"
        if (read.searchText.includes(kind)) score += 1
        // A post only about the other species is a poor fit (a Persian cat guide for a dog question).
        else if (read.searchText.includes(other)) score -= 4
      }
      return { read, score, relevance, index }
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
}

/** Up to `count` posts matching the question's words, topic and pet kind, newest first on ties. */
export function pickQuickReads(reads: QuickRead[], question: string, petKind: "dog" | "cat" | null, count = 3) {
  return rankReads(reads, question, petKind).slice(0, count).map(({ read }) => read)
}

/**
 * Posts for the side panel: the ones that really match the question, or (when nothing does)
 * the newest posts, flagged `related: false` so the panel doesn't call them related.
 */
export function relatedReads(reads: QuickRead[], question: string, petKind: "dog" | "cat" | null, count = 4) {
  const ranked = rankReads(reads, question, petKind)
  const matching = ranked.filter((entry) => entry.relevance >= 3 && entry.score > 0).slice(0, count)
  return matching.length
    ? { related: true, reads: matching.map(({ read }) => read) }
    : { related: false, reads: reads.slice(0, count) }
}

/** "While you wait" cards under the thinking card. */
export function QuickReads({ reads, onOpen }: { reads: QuickRead[]; onOpen: (read: QuickRead) => void }) {
  if (!reads.length) return null
  return (
    <section aria-label="Read while Paw GPT thinks" className="paw-gpt-anim-pop">
      <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        <BookOpen className="h-3.5 w-3.5 text-orange-500" /> While you wait
      </p>
      <div className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {reads.map((read) => (
          <button
            key={read.id}
            type="button"
            onClick={() => onOpen(read)}
            className="paw-glass group flex w-60 shrink-0 snap-start gap-2.5 rounded-2xl p-2 text-left transition hover:-translate-y-0.5 hover:ring-2 hover:ring-orange-400/30"
          >
            <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
              <Image src={read.image} alt="" fill sizes="64px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-xs font-bold leading-snug group-hover:text-orange-700 dark:group-hover:text-orange-300">{read.title}</span>
              <span className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" /> {read.readMinutes} min read · Quick view
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

/** A short preview of the post; the full article opens in a new tab so the chat keeps going. */
export function QuickViewDialog({ read, onOpenChange }: { read: QuickRead | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={read !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[2rem] p-0 sm:max-w-lg">
        {read && (
          <>
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-[2rem] bg-muted">
              <Image src={read.image} alt="" fill sizes="(min-width: 640px) 512px, 100vw" className="object-cover" />
            </div>
            <div className="space-y-3 px-6 pb-6 pt-1">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                {read.date && <>{formatBlogDate(read.date)} · </>}
                <Clock className="h-3 w-3" /> {read.readMinutes} min read · {read.authorName}
              </p>
              <DialogTitle className="text-xl font-black leading-snug tracking-tight">{read.title}</DialogTitle>
              <ReadAloudButton read={read} className="-ml-2.5" />
              <DialogDescription className="text-sm font-medium text-foreground/80">{read.excerpt}</DialogDescription>
              {read.preview && (
                <p className="relative max-h-48 overflow-hidden text-sm leading-relaxed text-muted-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-16 after:bg-gradient-to-t after:from-background after:to-transparent">
                  {read.preview}
                </p>
              )}
              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <Button asChild className="h-11 flex-1 rounded-2xl border-0 bg-orange-500 font-bold text-white hover:bg-orange-600">
                  <Link href={`/blog/${read.slug}`} target="_blank" rel="noopener">
                    Read full article <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-11 rounded-2xl font-semibold">
                  Back to chat
                </Button>
              </div>
              <p className="text-center text-[11px] text-muted-foreground">Opens in a new tab, so your Paw GPT answer keeps going here.</p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
