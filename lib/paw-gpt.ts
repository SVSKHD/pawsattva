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
