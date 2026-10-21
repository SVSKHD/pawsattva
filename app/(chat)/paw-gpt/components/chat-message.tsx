"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Check, Copy, History, RotateCcw, Sparkles, AlertTriangle, Utensils, Volume2, Square, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { MiniRunner } from "@/components/pet-scene/running-pets"
import { QuickReads, type QuickRead } from "./quick-reads"
import { useReadAloud } from "./read-aloud"

export interface ChatItem {
  id: string
  role: "user" | "assistant"
  content: string
  error?: boolean
  pending?: boolean
  createdAt?: number
}

/** One chat window: every question and answer asked about one pet until "New chat". */
export interface Conversation {
  id: string
  petName: string
  items: ChatItem[]
  createdAt: number
  updatedAt: number
}

interface ChatMessageProps {
  item: ChatItem
  petName?: string
  /** "Planning a pet" chats get planning-themed thinking steps */
  planning?: boolean
  /** The selected pet's kind leads the running pets while Paw GPT thinks */
  petKind?: "dog" | "cat"
  onRetry?: () => void
  /** Shown as "Log <pet>'s food" when the answer is about food */
  onLogFood?: () => void
  /** Blog posts offered while an answer takes a while */
  quickReads?: QuickRead[]
  onOpenQuickRead?: (read: QuickRead) => void
}

export function ChatMessage({ item, petName, petKind = "dog", planning = false, onRetry, onLogFood, quickReads, onOpenQuickRead }: ChatMessageProps) {
  if (item.role === "user") {
    return (
      <div id={`msg-${item.id}`} className="paw-gpt-anim-pop flex scroll-mt-24 justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-[1.4rem] rounded-br-md bg-gradient-to-b from-orange-400 to-orange-500 px-4 py-2.5 text-[15px] leading-snug text-white shadow-[0_6px_18px_-6px_rgba(249,115,22,0.55),inset_0_1px_0_rgba(255,255,255,0.3)]">
          {item.content}
        </p>
      </div>
    )
  }

  if (item.error) {
    return (
      <div className="paw-gpt-anim-pop flex gap-3">
        <Avatar />
        <div className="paw-glass flex min-w-0 flex-1 items-center gap-3 rounded-[1.4rem] px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <p className="min-w-0 flex-1 text-sm text-foreground/80">{item.content}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-black/[0.05] px-3 text-xs font-semibold text-foreground transition hover:bg-black/10 active:scale-95 dark:bg-white/10 dark:hover:bg-white/15"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Retry
            </button>
          )}
        </div>
      </div>
    )
  }

  if (item.pending && !item.content) {
    return (
      <div className="paw-gpt-anim-pop flex gap-3">
        <Avatar thinking />
        <div className="min-w-0 flex-1 space-y-3">
          <ThinkingPill petName={petName} petKind={petKind} planning={planning} />
          {quickReads?.length && onOpenQuickRead ? <DelayedQuickReads reads={quickReads} onOpen={onOpenQuickRead} /> : null}
        </div>
      </div>
    )
  }

  return (
    <div className="paw-gpt-anim-pop flex gap-3">
      <Avatar thinking={item.pending} />
      <div className="min-w-0 flex-1">
        <div className="paw-glass rounded-[1.4rem] rounded-tl-md px-4 py-3">
          <div className="prose prose-sm max-w-none text-[15px] leading-relaxed dark:prose-invert prose-headings:mb-2 prose-headings:mt-4 prose-headings:font-semibold prose-headings:tracking-tight prose-p:my-2 prose-li:my-0.5 prose-table:my-3 prose-th:bg-black/[0.03] prose-th:px-3 prose-th:py-1.5 prose-td:px-3 prose-td:py-1.5 prose-a:text-orange-600 prose-strong:text-foreground [&>*:first-child]:mt-0">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ children }) => (
                  <div className="overflow-x-auto rounded-2xl border border-black/5 dark:border-white/10">
                    <table className="my-0 text-xs">{children}</table>
                  </div>
                ),
                a: ({ href = "", children }) =>
                  href.startsWith("/") ? (
                    <Link href={href}>{children}</Link>
                  ) : (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ),
              }}
            >
              {item.content}
            </ReactMarkdown>
            {item.pending && <span aria-hidden className="ml-0.5 inline-block h-4 w-[3px] translate-y-0.5 animate-pulse rounded-full bg-orange-500" />}
          </div>
        </div>
        {!item.pending && <AnswerActions id={item.id} text={item.content} petName={petName} onLogFood={onLogFood} />}
      </div>
    </div>
  )
}

/** Quick reads appear only if the answer is slow, so fast answers don't flash cards. */
function DelayedQuickReads({ reads, onOpen }: { reads: QuickRead[]; onOpen: (read: QuickRead) => void }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 2500)
    return () => window.clearTimeout(timer)
  }, [])
  return visible ? <QuickReads reads={reads} onOpen={onOpen} /> : null
}

/** Actions under a finished answer, as one segmented group: Copy, Read aloud, and Log food when relevant. */
function AnswerActions({ id, text, petName, onLogFood }: { id: string; text: string; petName?: string; onLogFood?: () => void }) {
  const [copied, setCopied] = useState(false)
  const { user } = useAuth()
  const readAloud = useReadAloud(id, text, user)
  const button =
    "inline-flex h-8 items-center gap-1.5 px-3 text-xs font-semibold text-muted-foreground transition hover:bg-black/5 hover:text-foreground active:scale-95 dark:hover:bg-white/10"

  return (
    <div role="group" aria-label="Answer actions" className="paw-glass ml-1 mt-1.5 inline-flex items-center divide-x divide-black/5 overflow-hidden rounded-full dark:divide-white/10">
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1600)
          } catch {
            toast.error("Could not copy this answer.")
          }
        }}
        className={button}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
      {readAloud.available && (
        <button
          type="button"
          onClick={readAloud.toggle}
          aria-pressed={readAloud.status !== "idle"}
          className={`${button} ${readAloud.status !== "idle" ? "text-orange-700 dark:text-orange-300" : ""}`}
        >
          {readAloud.status === "loading" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : readAloud.status === "speaking" ? (
            <Square className="h-3 w-3 fill-current" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
          {readAloud.status === "loading" ? "Preparing…" : readAloud.status === "speaking" ? "Stop" : "Read aloud"}
        </button>
      )}
      {onLogFood && (
        <button type="button" onClick={onLogFood} className={`${button} text-orange-700 hover:text-orange-800 dark:text-orange-300`}>
          <Utensils className="h-3.5 w-3.5" />
          Log {petName ? `${petName}'s` : "pet"} food
        </button>
      )}
    </div>
  )
}

function Avatar({ thinking }: { thinking?: boolean }) {
  return (
    <span
      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-[0_4px_12px_-4px_rgba(249,115,22,0.6),inset_0_1px_0_rgba(255,255,255,0.35)] ${
        thinking ? "paw-gpt-anim-breathe" : ""
      }`}
    >
      <Sparkles className="h-4 w-4" />
    </span>
  )
}

/** Playful steps the little runner goes through, in the pet's own language. */
function thinkingSteps(petName: string | undefined, kind: "dog" | "cat", planning: boolean) {
  const name = petName || "your pet"
  if (planning) {
    return ["Sniffing out the right breeds", "Digging into costs", "Fetching a first-week checklist", "Chasing down the details", "Wagging out an answer"]
  }
  return kind === "cat"
    ? [`Pawing through ${name}'s profile`, "Batting at the meal logs", "Stalking the weight chart", "Pouncing on the details", "Purring out an answer"]
    : [`Sniffing through ${name}'s profile`, "Digging up meal logs", "Fetching the weight chart", "Chasing down the details", "Wagging out an answer"]
}

/**
 * Small "thinking" pill: a pet galloping in place and a status line that changes every ~1.6s.
 * Stays on the last step if the answer takes longer.
 */
export function ThinkingPill({ petName, petKind = "dog", planning = false }: { petName?: string; petKind?: "dog" | "cat"; planning?: boolean }) {
  const steps = thinkingSteps(petName, petKind, planning)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setStep((current) => Math.min(current + 1, steps.length - 1)), 1600)
    return () => window.clearInterval(timer)
  }, [steps.length])

  return (
    <div role="status" aria-live="polite" className="paw-glass inline-flex max-w-full items-center gap-2 rounded-full py-1 pl-1 pr-3.5">
      <span className="flex h-8 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-500/[0.08]">
        <MiniRunner kind={petKind} className="h-8 w-auto" />
      </span>
      <span key={step} className="paw-gpt-anim-pop min-w-0 truncate text-[13px] font-medium text-foreground/75">
        {steps[step]}
      </span>
      <span aria-hidden className="flex shrink-0 items-end gap-0.5 pb-0.5">
        {[0, 1, 2].map((dot) => (
          <span key={dot} className="paw-gpt-anim-dot h-1 w-1 rounded-full bg-orange-500" style={{ animationDelay: `${dot * 0.15}s` }} />
        ))}
      </span>
    </div>
  )
}

/** A slow, looping row of chips: earlier questions in this chat and facts from the record. */
export function HistoryTicker({ items, className = "" }: { items: string[]; className?: string }) {
  const doubled = [...items, ...items]
  return (
    <div className={`paw-gpt-marquee-mask overflow-hidden ${className}`} aria-hidden>
      <div className="paw-gpt-anim-marquee gap-2 pr-2" style={{ ["--marquee-duration" as string]: `${Math.max(16, items.length * 6)}s` }}>
        {doubled.map((text, index) => (
          <span
            key={index}
            className="inline-flex max-w-[16rem] shrink-0 items-center gap-1.5 rounded-full bg-black/[0.04] px-2.5 py-1 text-[11px] font-medium text-muted-foreground dark:bg-white/[0.07]"
          >
            <History className="h-3 w-3 shrink-0 text-orange-500" />
            <span className="truncate">{text}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

