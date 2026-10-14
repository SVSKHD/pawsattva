// Shared between the Paw GPT page and /api/paw-gpt.

export type PawGptRole = "user" | "assistant"

export interface PawGptMessage {
  role: PawGptRole
  content: string
}

export interface PawGptMealLog {
  date: string
  time?: string
  meal: string
  food: string
  quality?: string
  quantity?: string
  waterMl?: number
  treats?: string
  notes?: string
}

export interface PawGptWeight {
  date: string
  kg: number
}

/** Everything Paw GPT knows about the selected pet, built on the client from the owner's own data. */
export interface PawGptPetContext {
  today: string
  ownerName?: string
  pet: Record<string, string | number | boolean>
  mealLogs: PawGptMealLog[]
  weights: PawGptWeight[]
  summary: Record<string, string | number | boolean>
}

export interface PawGptRequest {
  context: PawGptPetContext
  messages: PawGptMessage[]
}

export const PAW_GPT_LIMITS = {
  maxMessages: 40,
  maxMessageChars: 4000,
  maxContextChars: 60_000,
  mealLogDays: 60,
  weightDays: 180,
} as const

/**
 * Questions a pet parent can ask per day (admins and authors are exempt).
 * Must match the limit in firebase/firestore.rules (users/{uid}/pawGptUsage).
 */
export const PAW_GPT_DAILY_LIMIT = 5

/**
 * AI tokens (prompt incl. the pet record + answer) a pet parent can use per day. A new
 * question can't start once this is reached. Must match firebase/firestore.rules.
 */
export const PAW_GPT_DAILY_TOKEN_LIMIT = 100_000

/**
 * Today's usage document id, by the India calendar day: "2026-10-14" → "2026-10-14",
 * but with unpadded month/day ("2026-1-5") so firestore.rules can build the same id.
 */
export function pawGptDayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date)
  const part = (type: string) => Number(parts.find((entry) => entry.type === type)?.value)
  return `${part("year")}-${part("month")}-${part("day")}`
}

export const pawGptUsagePath = (uid: string, dayKey = pawGptDayKey()) => `users/${uid}/pawGptUsage/${dayKey}`
