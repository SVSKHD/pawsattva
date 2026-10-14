"use client"

import type { User } from "firebase/auth"
import { app, appCheckEnabled } from "@/firebase/firebase"
import type { PawGptMessage, PawGptPetContext } from "./paw-gpt"

/**
 * Streams a Paw GPT answer from the configured backend.
 *
 *   anthropic   (default) — /api/paw-gpt route handler (server-side, Anthropic).
 *   firebase-ai — Firebase AI Logic (Gemini) called from the browser through a server
 *                 prompt template, protected by App Check. The prompt, model and limits
 *                 live in the template, so the browser can only fill in its variables.
 *
 * Switch with NEXT_PUBLIC_PAW_GPT_PROVIDER once App Check and the template are set up.
 */

export type PawGptProvider = "anthropic" | "firebase-ai"

export const PAW_GPT_PROVIDER: PawGptProvider =
  process.env.NEXT_PUBLIC_PAW_GPT_PROVIDER === "firebase-ai" ? "firebase-ai" : "anthropic"

const TEMPLATE_ID = process.env.NEXT_PUBLIC_PAW_GPT_TEMPLATE_ID || "paw-gpt-v1"

/** An error whose message is safe to show the pet parent. */
export class PawGptError extends Error {}

interface StreamRequest {
  user: User
  context: PawGptPetContext
  /** Completed turns, oldest first, ending with the new user message. */
  messages: PawGptMessage[]
  signal: AbortSignal
}

export function streamPawGptAnswer(request: StreamRequest): AsyncGenerator<string> {
  return PAW_GPT_PROVIDER === "firebase-ai" ? streamFromFirebaseAi(request) : streamFromRoute(request)
}

// ── Anthropic via /api/paw-gpt ───────────────────────────────────────────────

async function* streamFromRoute({ user, context, messages, signal }: StreamRequest) {
  const res = await fetch("/api/paw-gpt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify({ context, messages }),
    signal,
  })
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null)
    throw new PawGptError(data?.error || "Paw GPT could not answer right now. Please try again.")
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    if (chunk) yield chunk
  }
}

// ── Gemini via Firebase AI Logic ─────────────────────────────────────────────

const BLOCKED_REASONS = new Set(["SAFETY", "BLOCKLIST", "PROHIBITED_CONTENT", "RECITATION", "SPII", "OTHER"])

/** Earlier turns as a plain transcript; the template wraps it as data, not instructions. */
const transcript = (messages: PawGptMessage[]) =>
  messages.map(({ role, content }) => `${role === "user" ? "Owner" : "Paw GPT"}: ${content}`).join("\n\n")

async function* streamFromFirebaseAi({ context, messages, signal }: StreamRequest) {
  if (!appCheckEnabled()) {
    // Never call AI Logic unprotected: without App Check anyone could spend the quota.
    console.error("Paw GPT: NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY is not set, so App Check is off.")
    throw new PawGptError("Paw GPT isn't available right now. Please try again later.")
  }
  const question = messages.at(-1)
  if (question?.role !== "user") throw new PawGptError("Ask Paw GPT a question to get started.")

  const { getAI, getTemplateGenerativeModel, GoogleAIBackend, AIError } = await import("firebase/ai")
  // Limited-use tokens can each be used once, so a captured token can't be replayed.
  const ai = getAI(app, { backend: new GoogleAIBackend(), useLimitedUseAppCheckTokens: true })
  const model = getTemplateGenerativeModel(ai)

  let wroteText = false
  try {
    const result = await model.generateContentStream(
      TEMPLATE_ID,
      {
        petRecord: JSON.stringify(context),
        conversation: transcript(messages.slice(0, -1)),
        question: question.content,
      },
      { signal }
    )

    for await (const chunk of result.stream) {
      let text = ""
      try {
        text = chunk.text()
      } catch {
        // A blocked chunk has no text; the final response says why.
      }
      if (text) {
        wroteText = true
        yield text
      }
    }

    const final = await result.response
    const finishReason = final.candidates?.[0]?.finishReason
    const blockReason = final.promptFeedback?.blockReason
    if (blockReason || (finishReason && BLOCKED_REASONS.has(finishReason))) {
      yield `${wroteText ? "\n\n" : ""}Sorry, I can't help with that one. Try asking about your pet's care, food or health.`
    } else if (finishReason === "MAX_TOKENS") {
      yield "\n\n_(The answer was cut short — ask me to continue.)_"
    }
  } catch (error) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError")
    console.error("Paw GPT (Firebase AI) failed:", error)
    const message = error instanceof Error ? error.message : ""
    if (/429|RESOURCE_EXHAUSTED|quota/i.test(message)) {
      throw new PawGptError("Paw GPT is busy right now. Please try again in a minute.")
    }
    if (error instanceof AIError && error.code === "api-not-enabled") {
      throw new PawGptError("Paw GPT isn't available right now. Please try again later.")
    }
    if (/app.?check|attestation|401|403/i.test(message)) {
      throw new PawGptError("We couldn't verify this browser. Refresh the page and try again.")
    }
    throw new PawGptError(
      wroteText ? "The answer was interrupted. Please try again." : "Something went wrong while answering. Please try again."
    )
  }
}
