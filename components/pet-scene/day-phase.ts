"use client"

import { useSyncExternalStore } from "react"

export type DayPhase = "morning" | "afternoon" | "evening" | "night"

export const phaseOf = (hour: number): DayPhase =>
  hour >= 5 && hour < 12 ? "morning" : hour >= 12 && hour < 17 ? "afternoon" : hour >= 17 && hour < 21 ? "evening" : "night"

export const phaseCopy: Record<DayPhase, { greeting: string; line: string; sky: string }> = {
  morning: {
    greeting: "Good morning",
    line: "Fresh start for the furry crew. Breakfast sorted?",
    sky: "from-amber-100/80 via-orange-50/50 dark:from-amber-950/40 dark:via-orange-950/10",
  },
  afternoon: {
    greeting: "Good afternoon",
    line: "Perfect time to check on water, walks and naps.",
    sky: "from-sky-100/80 via-sky-50/40 dark:from-sky-950/40 dark:via-sky-950/10",
  },
  evening: {
    greeting: "Good evening",
    line: "Dinner time is near. How was their day?",
    sky: "from-orange-200/70 via-rose-100/40 dark:from-rose-950/40 dark:via-orange-950/10",
  },
  night: {
    greeting: "Hello, night owl",
    line: "The furry ones are dozing off. I'm still here if you need me.",
    sky: "from-indigo-200/70 via-indigo-50/40 dark:from-indigo-950/60 dark:via-indigo-950/20",
  },
}

const subscribeToClock = (onChange: () => void) => {
  const timer = window.setInterval(onChange, 60_000)
  return () => window.clearInterval(timer)
}

/**
 * Current part of the day in the viewer's own time zone, refreshed every minute.
 * Server-rendered HTML uses `serverPhase`, then the browser switches to its local clock without a hydration mismatch.
 */
export function useDayPhase(serverPhase: DayPhase = "morning") {
  return useSyncExternalStore(
    subscribeToClock,
    () => phaseOf(new Date().getHours()),
    () => serverPhase
  )
}
