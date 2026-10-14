"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore"
import { BookOpen, Clock, ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { db } from "@/firebase/db"
import type { Blog } from "@/firebase/firestore"
import { clip, formatBlogDate, toBlogSummary, toPlainText, type BlogSummary } from "@/app/(main)/blog/blog-summary"

export interface QuickRead extends BlogSummary {
  /** The article's opening as plain text (never rendered as HTML here) */
  preview: string
}

const RECENT_POSTS = 24
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
        .map((blog) => ({ ...toBlogSummary(blog), preview: clip(toPlainText(blog.content || ""), 700) }))
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

const STOP_WORDS = new Set(["what", "when", "which", "with", "should", "could", "would", "about", "there", "their", "they", "this", "that", "have", "does", "from", "your", "much", "many", "give", "tell", "make", "best"])

// Everyday wording → words articles actually use ("eat" → feed / food / diet …).
const TOPICS: [RegExp, string[]][] = [
  [/\b(eat|eats|ate|food|feed|feeding|diet|meal|meals|portion|kibble|treat|treats|nutrition|hungry)\b/, ["feed", "food", "diet", "nutrition", "meal", "treat"]],
  [/\b(groom|grooming|bath|bathe|brush|coat|hair|shed|shedding|fur|nail|nails)\b/, ["groom", "bath", "coat", "hair", "brush", "shed"]],
  [/\b(weight|fat|obese|overweight|thin|skinny)\b/, ["weight", "obes", "body condition"]],
  [/\b(water|drink|drinking|hydrat)/, ["water", "hydrat"]],
  [/\b(walk|walks|exercise|play|energy|active)\b/, ["walk", "exercise", "play", "activ"]],
  [/\b(sick|ill|unwell|vomit|vomiting|diarrh|symptom|symptoms|vet|fever|scratch|itch)/, ["sick", "unwell", "signs", "health", "vet", "symptom"]],
  [/\b(heat|summer|hot)\b/, ["heat", "summer"]],
  [/\b(puppy|kitten|adopt|adoption|new pet|breed|breeds)\b/, ["puppy", "kitten", "adopt", "breed"]],
]

/** Up to `count` posts matching the question's words, topic and pet kind, newest first on ties. */
export function pickQuickReads(reads: QuickRead[], question: string, petKind: "dog" | "cat" | null, count = 3) {
  const text = question.toLowerCase()
  const words = (text.match(/[a-z]{4,}/g) ?? []).filter((word) => !STOP_WORDS.has(word))
  const topicWords = TOPICS.filter(([pattern]) => pattern.test(text)).flatMap(([, related]) => related)
  return reads
    .map((read, index) => {
      let score = 0
      for (const word of words) if (read.searchText.includes(word.replace(/s$/, ""))) score += 2
      for (const word of topicWords) if (read.searchText.includes(word)) score += 3
      if (petKind) {
        const other = petKind === "dog" ? "cat" : "dog"
        if (read.searchText.includes(petKind)) score += 1
        // A post only about the other species is a poor fit (a Persian cat guide for a dog question).
        else if (read.searchText.includes(other)) score -= 4
      }
      return { read, score, index }
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, count)
    .map(({ read }) => read)
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
