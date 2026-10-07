"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Check, Copy, History, RotateCcw, Sparkles, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

export interface ChatItem {
  id: string
  role: "user" | "assistant"
  content: string
  error?: boolean
  pending?: boolean
  createdAt?: number
}

interface ChatMessageProps {
  item: ChatItem
  petName?: string
  /** Earlier questions and record facts shown in the moving banner while Paw GPT works */
  ticker?: string[]
  onRetry?: () => void
}

export function ChatMessage({ item, petName, ticker = [], onRetry }: ChatMessageProps) {
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
        <ThinkingBanner petName={petName} ticker={ticker} />
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
        {!item.pending && <CopyButton text={item.content} />}
      </div>
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

const STEPS = ["Reading the profile", "Going through meal logs", "Checking the weight trend", "Recalling this chat", "Writing the answer"]

/** Live status while Paw GPT prepares an answer, with the chat history drifting by underneath. */
export function ThinkingBanner({ petName, ticker }: { petName?: string; ticker: string[] }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setStep((current) => Math.min(current + 1, STEPS.length - 1)), 1400)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div role="status" aria-live="polite" className="paw-glass min-w-0 flex-1 overflow-hidden rounded-[1.4rem] rounded-tl-md">
      <div className="flex items-center justify-between gap-3 px-4 pt-3">
        <p className="paw-gpt-anim-shimmer truncate text-sm font-semibold text-foreground/70">
          Thinking about {petName || "your pet"}…
        </p>
        <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
          {step + 1}/{STEPS.length}
        </span>
      </div>
      <p key={step} className="paw-gpt-anim-pop px-4 pb-2 pt-0.5 text-xs text-muted-foreground">
        {STEPS[step]}
      </p>
      <div className="mx-4 mb-3 h-1 overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-[width] duration-700 ease-out"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>
      {ticker.length > 0 && <HistoryTicker items={ticker} className="border-t border-black/5 py-2 dark:border-white/10" />}
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
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
      className="ml-1 mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-black/5 hover:text-foreground active:scale-95 dark:hover:bg-white/10"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  )
}
