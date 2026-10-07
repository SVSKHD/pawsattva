"use client"

import { useState } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { AlertTriangle, Check, Copy, Sparkles } from "lucide-react"
import { toast } from "sonner"

export interface ChatItem {
  id: string
  role: "user" | "assistant"
  content: string
  error?: boolean
  pending?: boolean
}

export function ChatMessage({ item }: { item: ChatItem }) {
  if (item.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-lg bg-orange-500 px-4 py-2.5 text-sm text-white shadow-sm shadow-orange-500/20">
          {item.content}
        </p>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-sm">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        {item.error ? (
          <p className="flex items-start gap-2 rounded-2xl border border-rose-300/60 bg-rose-50/70 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {item.content}
          </p>
        ) : item.pending && !item.content ? (
          <TypingDots />
        ) : (
          <>
            <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:mb-2 prose-headings:mt-4 prose-headings:font-bold prose-p:my-2 prose-li:my-0.5 prose-table:my-3 prose-th:bg-muted/60 prose-th:px-3 prose-th:py-1.5 prose-td:px-3 prose-td:py-1.5 prose-a:text-orange-600">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ children }) => (
                    <div className="overflow-x-auto rounded-xl border">
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
            </div>
            {!item.pending && <CopyButton text={item.content} />}
          </>
        )}
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
      className="mt-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  )
}

function TypingDots() {
  return (
    <span aria-label="Paw GPT is thinking" className="inline-flex h-8 items-center gap-1 rounded-2xl bg-muted px-3">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-500"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  )
}
