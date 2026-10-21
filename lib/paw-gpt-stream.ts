"use client"

import type { User } from "firebase/auth"
import { app, appCheckEnabled } from "@/firebase/firebase"
import {
  PAW_GPT_DAILY_LIMIT,
  PAW_GPT_DAILY_PASS,
  PAW_GPT_DAILY_TOKEN_LIMIT,
  PAW_GPT_GUEST_REMAINING_HEADER,
  PAW_GPT_SUBSCRIPTION,
  pawGptSubscriptionPath,
  pawGptUsagePath,
  type PawGptMessage,
  type PawGptPetContext,
} from "./paw-gpt"

/**
 * Streams a Paw GPT answer from the configured backend.
 *
 *   server      (default) — /api/paw-gpt route handler. It answers with Gemini (GEMINI_API_KEY)
 *                 or Claude (ANTHROPIC_API_KEY); see serverProvider() in the route.
 *   firebase-ai — Firebase AI Logic (Gemini) called from the browser through a server
 *                 prompt template, protected by App Check. The prompt, model and limits
 *                 live in the template, so the browser can only fill in its variables.
 *
 * Choose with NEXT_PUBLIC_PAW_GPT_PROVIDER ("server" or "firebase-ai"; the old value
 * "anthropic" still means the server route).
 */

export type PawGptProvider = "server" | "firebase-ai"

export const PAW_GPT_PROVIDER: PawGptProvider =
  process.env.NEXT_PUBLIC_PAW_GPT_PROVIDER === "firebase-ai" ? "firebase-ai" : "server"

const TEMPLATE_ID = process.env.NEXT_PUBLIC_PAW_GPT_TEMPLATE_ID || "paw-gpt-v1"

/** An error whose message is safe to show the pet parent. */
export class PawGptError extends Error {
  constructor(message: string, readonly code?: "daily-limit" | "token-limit" | "pass-used-up" | "sign-in-required") {
    super(message)
  }
}

const plusUsedUpError = () =>
  new PawGptError(
    `You've used today's ${PAW_GPT_SUBSCRIPTION.dailyTokenLimit.toLocaleString("en-IN")} ${PAW_GPT_SUBSCRIPTION.name} tokens. Paw GPT will be back for you after midnight.`,
    "pass-used-up"
  )

const dailyLimitError = () =>
  new PawGptError(
    `You've used all ${PAW_GPT_DAILY_LIMIT} Paw GPT questions for today. You can ask more after midnight.`,
    "daily-limit"
  )

const passUsedUpError = () =>
  new PawGptError(
    `You've used today's Daily Pass (${PAW_GPT_DAILY_PASS.tokenLimit.toLocaleString("en-IN")} tokens). Paw GPT will be back for you after midnight.`,
    "pass-used-up"
  )

const tokenLimitError = () =>
  new PawGptError(
    `You've used today's ${PAW_GPT_DAILY_TOKEN_LIMIT.toLocaleString("en-IN")} Paw GPT tokens. You can ask more after midnight.`,
    "token-limit"
  )

interface StreamRequest {
  /** null: a visitor who isn't signed in (a few free questions through the server route) */
  user: User | null
  context: PawGptPetContext
  /** Completed turns, oldest first, ending with the new user message. */
  messages: PawGptMessage[]
  signal: AbortSignal
  /** Admins and authors have no daily question limit. */
  exempt: boolean
  /** Guests: free questions left after this one, once the server has counted it. */
  onGuestRemaining?: (remaining: number) => void
}

export function streamPawGptAnswer(request: StreamRequest): AsyncGenerator<string> {
  // Guests are always counted on the server, whichever backend signed-in users use.
  return PAW_GPT_PROVIDER === "firebase-ai" && request.user
    ? streamFromFirebaseAi({ ...request, user: request.user })
    : streamFromRoute(request)
}

// ── Server route /api/paw-gpt (Gemini or Claude) ─────────────────────────────

async function* streamFromRoute({ user, context, messages, signal, onGuestRemaining }: StreamRequest) {
  const res = await fetch("/api/paw-gpt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(user ? { Authorization: `Bearer ${await user.getIdToken()}` } : {}),
    },
    body: JSON.stringify({ context, messages }),
    signal,
  })
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null)
    if (data?.code === "DAILY_LIMIT") throw dailyLimitError()
    if (data?.code === "TOKEN_LIMIT") throw tokenLimitError()
    if (data?.code === "PASS_USED_UP") throw passUsedUpError()
    if (data?.code === "PLUS_USED_UP") throw plusUsedUpError()
    if (data?.code === "SIGN_IN_REQUIRED") {
      throw new PawGptError(data.error || "Sign in to keep asking Paw GPT.", "sign-in-required")
    }
    throw new PawGptError(data?.error || "Paw GPT could not answer right now. Please try again.")
  }
  const remaining = Number(res.headers.get(PAW_GPT_GUEST_REMAINING_HEADER) ?? NaN)
  if (!user && Number.isFinite(remaining)) onGuestRemaining?.(remaining)
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

/**
 * Uses one of today's questions before calling Gemini. Firestore rules cap the counter, so a
 * denied write means the limit is reached. This path runs in the browser, so unlike the
 * Anthropic route it can't stop someone who calls AI Logic directly; App Check and the
 * AI Logic per-user rate limit are the backstop there.
 */
async function consumeDailyQuestion(user: User, exempt: boolean) {
  const [{ doc, getDoc, increment, serverTimestamp, setDoc }, { db }] = await Promise.all([
    import("firebase/firestore"),
    import("@/firebase/db"),
  ])
  const ref = doc(db, pawGptUsagePath(user.uid))
  if (exempt) {
    // Admins and authors are counted for the usage totals but never limited.
    await setDoc(ref, { count: increment(1), updatedAt: serverTimestamp() }, { merge: true }).catch((error) =>
      console.error("Paw GPT: could not count an admin question:", error)
    )
    return
  }
  const [current, subscription] = await Promise.all([
    getDoc(ref),
    getDoc(doc(db, pawGptSubscriptionPath(user.uid))).catch(() => null),
  ])
  const tokens = Number(current.get("tokens") ?? 0)
  const passTokenLimit = Number(current.get("passTokenLimit") ?? 0)
  const subscribed = (subscription?.get("activeUntil")?.toMillis?.() ?? 0) > Date.now()
  if (subscribed) {
    if (tokens >= Math.max(passTokenLimit, PAW_GPT_SUBSCRIPTION.dailyTokenLimit)) throw plusUsedUpError()
  } else if (passTokenLimit > 0) {
    if (tokens >= passTokenLimit) throw passUsedUpError()
  } else {
    if (tokens >= PAW_GPT_DAILY_TOKEN_LIMIT) throw tokenLimitError()
    if (Number(current.get("count") ?? 0) >= PAW_GPT_DAILY_LIMIT) throw dailyLimitError()
  }
  try {
    await setDoc(ref, { count: increment(1), updatedAt: serverTimestamp() }, { merge: true })
  } catch (error) {
    if ((error as { code?: string })?.code === "permission-denied") throw dailyLimitError()
    throw error
  }
}

/** Adds an answer's tokens to today's totals. Best effort: the answer is already shown. */
async function recordTokens(user: User, usage: { totalTokenCount?: number; promptTokenCount?: number } | undefined) {
  const total = Math.max(0, Math.round(usage?.totalTokenCount ?? 0))
  if (!total) return
  // Gemini's total also includes thinking tokens, which are billed as output.
  const input = Math.min(total, Math.max(0, Math.round(usage?.promptTokenCount ?? 0)))
  try {
    const [{ doc, increment, serverTimestamp, setDoc }, { db }] = await Promise.all([
      import("firebase/firestore"),
      import("@/firebase/db"),
    ])
    await setDoc(
      doc(db, pawGptUsagePath(user.uid)),
      { tokens: increment(total), inputTokens: increment(input), outputTokens: increment(total - input), updatedAt: serverTimestamp() },
      { merge: true }
    )
  } catch (error) {
    console.error("Paw GPT: could not record token usage:", error)
  }
}

async function* streamFromFirebaseAi({ user, context, messages, signal, exempt }: StreamRequest & { user: User }) {
  if (!appCheckEnabled()) {
    // Never call AI Logic unprotected: without App Check anyone could spend the quota.
    console.error("Paw GPT: NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY is not set, so App Check is off.")
    throw new PawGptError("Paw GPT isn't available right now. Please try again later.")
  }
  const question = messages.at(-1)
  if (question?.role !== "user") throw new PawGptError("Ask Paw GPT a question to get started.")
  await consumeDailyQuestion(user, exempt)

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
    await recordTokens(user, final.usageMetadata)
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
