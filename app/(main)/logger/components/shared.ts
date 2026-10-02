import { format } from "date-fns"
import type { FeedQuality, LoggerMealType } from "@/lib/logger-store"

export const mealLabels: Record<LoggerMealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  supplement: "Supplement",
  other: "Other",
}

export const mealOptions = Object.entries(mealLabels) as [LoggerMealType, string][]

export const qualityLabels: Record<FeedQuality, string> = {
  healthy: "Healthy",
  okay: "Okay",
  poor: "Poor",
}

export const qualityScores: Record<FeedQuality, number> = {
  healthy: 3,
  okay: 2,
  poor: 1,
}

export const qualityPillClass: Record<FeedQuality, string> = {
  healthy: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  okay: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  poor: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
}

export const scoreLabel = (score: number) => (score >= 2.5 ? "Healthy" : score >= 1.5 ? "Okay" : "Poor")

export const toDateKey = (date: Date) => format(date, "yyyy-MM-dd")

export const currentTime = () =>
  new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })

/** Sensible meal for the current time of day, so most logs need no meal change */
export const mealForNow = (): LoggerMealType => {
  const hour = new Date().getHours()
  if (hour < 11) return "breakfast"
  if (hour < 16) return "lunch"
  if (hour < 19) return "snack"
  return "dinner"
}

export interface LoggerPet {
  name: string
  type?: string
  breed?: string
  foodBrand?: string
  foodType?: string
  dailyQuantity?: string
  weightKg?: number
}

export const isCat = (pet?: LoggerPet | null) => Boolean(pet?.type?.toLowerCase().includes("cat"))
