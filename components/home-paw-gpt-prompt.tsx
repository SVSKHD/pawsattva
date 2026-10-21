"use client"

import { useState, type FormEvent, type KeyboardEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowUp, Sparkles } from "lucide-react"

import { PAW_GPT_LIMITS } from "@/lib/paw-gpt"

const suggestions = [
  "How much should my puppy eat each day?",
  "Is my cat at a healthy weight?",
  "Which dog breed suits a small apartment?",
]

/** Hero ask box: Enter opens Paw GPT with the same question. */
export function HomePawGptPrompt() {
  const router = useRouter()
  const [input, setInput] = useState("")

  const ask = (text: string) => {
    const question = text.trim()
    if (!question) return
    router.push(`/paw-gpt?q=${encodeURIComponent(question)}`)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    ask(input)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      ask(input)
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl lg:mx-0">
      <p className="mb-2 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wide text-orange-600 lg:justify-start dark:text-orange-400">
        <Sparkles className="h-3.5 w-3.5" />
        Ask Paw GPT
      </p>
      <form
        onSubmit={handleSubmit}
        className="paw-glass rounded-[1.75rem] p-2 text-left transition focus-within:ring-4 focus-within:ring-orange-500/15"
      >
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={PAW_GPT_LIMITS.maxMessageChars}
            placeholder="Ask about food, weight, breeds…"
            aria-label="Ask Paw GPT"
            className="block max-h-40 min-h-10 w-full resize-none bg-transparent px-3 py-2 text-[15px] outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            aria-label="Ask Paw GPT"
            disabled={!input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-md shadow-orange-500/25 transition hover:bg-orange-600 disabled:opacity-40"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap justify-center gap-2 lg:justify-start">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => ask(suggestion)}
            className="inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold text-orange-700 ring-1 ring-orange-500/25 transition hover:bg-orange-500/10 dark:text-orange-300"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
