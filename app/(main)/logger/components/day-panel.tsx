"use client"

import { useEffect, useState } from "react"
import { addDays, format, isToday, subDays } from "date-fns"
import { ChevronLeft, ChevronRight, Copy, Droplets, Loader2, Plus, Share2, Trash2, Utensils } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { LoggerMealType, PetLoggerEntry } from "@/lib/logger-store"
import { mealLabels, qualityLabels, qualityPillClass, qualityScores, scoreLabel } from "./shared"

interface DayPanelProps {
  date: Date
  onDateChange: (date: Date) => void
  entries: PetLoggerEntry[]
  loading: boolean
  /** Show the pet name on each entry (when viewing all pets) */
  showPet: boolean
  onAdd: (meal?: LoggerMealType) => void
  onLogAgain: (entry: PetLoggerEntry) => void
  onDelete: (entry: PetLoggerEntry) => Promise<void>
  onShare: () => void
}

export function DayPanel({ date, onDateChange, entries, loading, showPet, onAdd, onLogAgain, onDelete, onShare }: DayPanelProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // A pending "confirm delete" quietly expires
  useEffect(() => {
    if (!confirmId) return
    const timer = window.setTimeout(() => setConfirmId(null), 4000)
    return () => window.clearTimeout(timer)
  }, [confirmId])

  const water = entries.reduce((sum, entry) => sum + (entry.waterMl ?? 0), 0)
  const rated = entries.filter((entry) => entry.feedQuality)
  const avgQuality = rated.length
    ? rated.reduce((sum, entry) => sum + qualityScores[entry.feedQuality!], 0) / rated.length
    : null

  const stats = [
    { label: "Meals", value: String(entries.length) },
    { label: "Water", value: water ? `${water} ml` : "—" },
    { label: "Treats", value: String(entries.filter((entry) => entry.treats).length) },
    { label: "Quality", value: avgQuality === null ? "—" : scoreLabel(avgQuality) },
  ]

  const remove = async (entry: PetLoggerEntry) => {
    setDeletingId(entry.id)
    try {
      await onDelete(entry)
    } finally {
      setDeletingId(null)
      setConfirmId(null)
    }
  }

  return (
    <section className="rounded-3xl border bg-card shadow-sm">
      {/* Day navigation */}
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3 sm:px-5">
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg" aria-label="Previous day" onClick={() => onDateChange(subDays(date, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg" aria-label="Next day" onClick={() => onDateChange(addDays(date, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-black leading-tight">
            {isToday(date) ? "Today" : format(date, "EEEE")}
            <span className="ml-2 text-sm font-semibold text-muted-foreground">{format(date, "dd MMM yyyy")}</span>
          </h2>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!isToday(date) && (
            <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => onDateChange(new Date())}>
              Today
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={onShare} disabled={!entries.length}>
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Share day</span>
          </Button>
        </div>
      </div>

      {/* Day totals */}
      <dl className="grid grid-cols-4 divide-x border-b">
        {stats.map((stat) => (
          <div key={stat.label} className="px-3 py-3 text-center sm:px-4">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</dt>
            <dd className="mt-0.5 truncate text-sm font-black sm:text-base">{stat.value}</dd>
          </div>
        ))}
      </dl>

      {/* Timeline */}
      <div className="p-4 sm:p-5">
        {loading && !entries.length ? (
          <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading logs…
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600">
              <Utensils className="h-6 w-6" />
            </span>
            <p className="font-bold">Nothing logged {isToday(date) ? "today" : "on this day"}</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">Start with a quick meal — you can add water, treats and notes too.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {(["breakfast", "lunch", "dinner"] as LoggerMealType[]).map((meal) => (
                <Button key={meal} type="button" variant="outline" size="sm" className="rounded-full" onClick={() => onAdd(meal)}>
                  <Plus className="h-3.5 w-3.5" /> {mealLabels[meal]}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <ol className="relative space-y-3 before:absolute before:bottom-3 before:left-[3.8rem] before:top-3 before:w-px before:bg-border">
            {entries.map((entry) => (
              <li key={entry.id} className="relative flex gap-3">
                <span className="w-11 shrink-0 pt-3 text-right text-xs font-bold tabular-nums text-muted-foreground">
                  {entry.loggedAt || "—"}
                </span>
                <span className="relative z-10 mt-3.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-background bg-orange-500 ring-2 ring-orange-500/20" />
                <article className="group min-w-0 flex-1 rounded-2xl border bg-background p-3.5 transition hover:border-orange-200 dark:hover:border-orange-900">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                        {mealLabels[entry.mealType]}
                        {showPet && <span className="text-muted-foreground"> · {entry.petName}</span>}
                      </p>
                      <h3 className="mt-0.5 truncate font-bold">{entry.foodName}</h3>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {entry.feedQuality && (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${qualityPillClass[entry.feedQuality]}`}>
                          {qualityLabels[entry.feedQuality]}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onLogAgain(entry)}
                        title="Log this again"
                        aria-label={`Log ${entry.foodName} again`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground opacity-60 transition hover:bg-muted hover:text-foreground group-hover:opacity-100"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      {confirmId === entry.id ? (
                        <button
                          type="button"
                          onClick={() => remove(entry)}
                          disabled={deletingId === entry.id}
                          className="flex h-7 items-center gap-1 rounded-lg bg-destructive px-2 text-[11px] font-bold text-white"
                        >
                          {deletingId === entry.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          Delete?
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmId(entry.id)}
                          title="Delete"
                          aria-label={`Delete ${entry.foodName}`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground opacity-60 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {(entry.quantity || entry.waterMl !== undefined || entry.treats) && (
                    <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                      {entry.quantity && <span className="rounded-full bg-muted px-2.5 py-1 font-medium">{entry.quantity}</span>}
                      {entry.waterMl !== undefined && (
                        <span className="flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-1 font-medium text-sky-700 dark:text-sky-300">
                          <Droplets className="h-3 w-3" /> {entry.waterMl} ml
                        </span>
                      )}
                      {entry.treats && (
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 font-medium text-amber-700 dark:text-amber-300">
                          Treats: {entry.treats}
                        </span>
                      )}
                    </div>
                  )}
                  {entry.notes && <p className="mt-2 text-sm leading-6 text-muted-foreground">{entry.notes}</p>}
                </article>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}
