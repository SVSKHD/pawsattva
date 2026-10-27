"use client"

import { useState } from "react"
import { addDays, format, isSameDay, isToday, startOfWeek, subDays } from "date-fns"
import { ChevronLeft, ChevronRight, Cookie, Copy, Droplets, Loader2, Plus, Share2, Sparkles, Trash2, Utensils } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { LoggerMealType, PetLoggerEntry } from "@/lib/logger-store"
import { mealIcons, mealLabels, mealTint, qualityLabels, qualityPillClass, qualityScores, scoreLabel, toDateKey } from "./shared"

interface DayPanelProps {
  date: Date
  onDateChange: (date: Date) => void
  entries: PetLoggerEntry[]
  loading: boolean
  /** Days (yyyy-MM-dd) with at least one log, for the week strip dots */
  loggedDays: Set<string>
  /** Show the pet name on each entry (when viewing all pets) */
  showPet: boolean
  onAdd: (meal?: LoggerMealType) => void
  onLogAgain: (entry: PetLoggerEntry) => void
  /** Removes the entry; the parent offers Undo */
  onDelete: (entry: PetLoggerEntry) => Promise<void>
  onShare: () => void
}

const MAIN_MEALS: LoggerMealType[] = ["breakfast", "lunch", "dinner"]

export function DayPanel({ date, onDateChange, entries, loading, loggedDays, showPet, onAdd, onLogAgain, onDelete, onShare }: DayPanelProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const water = entries.reduce((sum, entry) => sum + (entry.waterMl ?? 0), 0)
  const rated = entries.filter((entry) => entry.feedQuality)
  const avgQuality = rated.length
    ? rated.reduce((sum, entry) => sum + qualityScores[entry.feedQuality!], 0) / rated.length
    : null

  const stats = [
    { label: "Meals", value: String(entries.length), icon: Utensils, tint: "text-orange-600 bg-orange-500/10 dark:text-orange-300" },
    { label: "Water", value: water ? `${water} ml` : "—", icon: Droplets, tint: "text-sky-600 bg-sky-500/10 dark:text-sky-300" },
    { label: "Treats", value: String(entries.filter((entry) => entry.treats).length), icon: Cookie, tint: "text-pink-600 bg-pink-500/10 dark:text-pink-300" },
    { label: "Quality", value: avgQuality === null ? "—" : scoreLabel(avgQuality), icon: Sparkles, tint: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-300" },
  ]

  // Main meals not logged yet on this day, offered as one-tap shortcuts
  const missingMeals = MAIN_MEALS.filter((meal) => !entries.some((entry) => entry.mealType === meal))
  const week = Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(date, { weekStartsOn: 1 }), index))

  const remove = async (entry: PetLoggerEntry) => {
    setDeletingId(entry.id)
    try {
      await onDelete(entry)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="paw-glass overflow-hidden rounded-3xl">
      {/* Day navigation */}
      <div className="flex flex-wrap items-center gap-3 px-4 pb-2 pt-4 sm:px-5">
        <div key={toDateKey(date)} className="paw-fade min-w-0">
          <h2 className="text-xl font-black leading-tight">{isToday(date) ? "Today" : format(date, "EEEE")}</h2>
          <p className="text-xs font-semibold text-muted-foreground">{format(date, "dd MMMM yyyy")}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {!isToday(date) && (
            <Button type="button" variant="ghost" size="sm" className="paw-field-glass rounded-xl border" onClick={() => onDateChange(new Date())}>
              Today
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" className="paw-field-glass rounded-xl border" onClick={onShare} disabled={!entries.length}>
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Share day</span>
          </Button>
        </div>
      </div>

      {/* Week strip: fastest way to hop between nearby days, dots mark days with logs */}
      <div className="flex items-center gap-1 px-2 pb-3 sm:px-3">
        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-xl" aria-label="Previous week" onClick={() => onDateChange(subDays(date, 7))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div role="group" aria-label="Week" className="grid flex-1 grid-cols-7 gap-1">
          {week.map((day) => {
            const selected = isSameDay(day, date)
            const logged = loggedDays.has(toDateKey(day))
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onDateChange(day)}
                aria-pressed={selected}
                aria-label={`${format(day, "EEEE dd MMMM")}${logged ? ", has logs" : ""}`}
                className={`relative flex h-14 flex-col items-center justify-center rounded-2xl text-center transition-all duration-300 ease-[var(--pf-ease)] ${
                  selected
                    ? "bg-orange-500 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_18px_-8px_rgba(249,115,22,0.7)]"
                    : "hover:bg-orange-500/10"
                }`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wider ${selected ? "text-white/80" : "text-muted-foreground"}`}>{format(day, "EEEEE")}</span>
                <span className={`text-sm font-black tabular-nums ${!selected && isToday(day) ? "text-orange-600 dark:text-orange-400" : ""}`}>{format(day, "d")}</span>
                <span className={`mt-0.5 h-1 w-1 rounded-full transition-opacity ${logged ? "opacity-100" : "opacity-0"} ${selected ? "bg-white" : "bg-orange-500"}`} />
              </button>
            )
          })}
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-xl" aria-label="Next week" onClick={() => onDateChange(addDays(date, 7))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day totals */}
      <dl className="grid grid-cols-2 gap-2 border-y border-white/60 bg-white/25 px-4 py-3 sm:grid-cols-4 sm:px-5 dark:border-white/5 dark:bg-white/[0.02]">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-2.5">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${stat.tint}`}>
              <stat.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</dt>
              <dd key={stat.value} className="paw-fade truncate text-sm font-black">{stat.value}</dd>
            </div>
          </div>
        ))}
      </dl>

      {/* Timeline */}
      <div key={toDateKey(date)} className="paw-fade p-4 sm:p-5">
        {loading && !entries.length ? (
          <div className="space-y-3" aria-label="Loading logs">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex animate-pulse gap-3">
                <span className="h-10 w-10 shrink-0 rounded-2xl bg-muted" />
                <span className="h-20 flex-1 rounded-2xl bg-muted/70" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-orange-500/10 text-orange-600">
              <Utensils className="h-6 w-6" />
            </span>
            <p className="font-bold">Nothing logged {isToday(date) ? "today" : "on this day"}</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">Start with a quick meal. You can add water, treats and notes too.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {MAIN_MEALS.map((meal) => (
                <MealShortcut key={meal} meal={meal} onClick={() => onAdd(meal)} />
              ))}
            </div>
          </div>
        ) : (
          <>
            <ol className="relative space-y-3 before:absolute before:bottom-6 before:left-5 before:top-6 before:w-px before:bg-gradient-to-b before:from-orange-300/70 before:to-transparent">
              {entries.map((entry) => {
                const Icon = mealIcons[entry.mealType]
                const deleting = deletingId === entry.id
                return (
                  <li key={entry.id} className={`paw-fade relative flex gap-3 transition-opacity ${deleting ? "opacity-40" : ""}`}>
                    <span className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-4 ring-white/70 backdrop-blur dark:ring-zinc-900/70 ${mealTint[entry.mealType]}`}>
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <article className="paw-field-glass group min-w-0 flex-1 rounded-2xl border p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            <span className="text-orange-600 dark:text-orange-400">{mealLabels[entry.mealType]}</span>
                            {entry.loggedAt && <span className="tabular-nums"> · {entry.loggedAt}</span>}
                            {showPet && <span> · {entry.petName}</span>}
                          </p>
                          <h3 className="mt-0.5 truncate font-bold">{entry.foodName}</h3>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          {entry.feedQuality && (
                            <span className={`mr-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${qualityPillClass[entry.feedQuality]}`}>
                              {qualityLabels[entry.feedQuality]}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => onLogAgain(entry)}
                            title="Log this again"
                            aria-label={`Log ${entry.foodName} again`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-orange-500/10 hover:text-orange-600 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(entry)}
                            disabled={deleting}
                            title="Delete"
                            aria-label={`Delete ${entry.foodName}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                          >
                            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>

                      {(entry.quantity || entry.waterMl !== undefined || entry.treats) && (
                        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                          {entry.quantity && <span className="rounded-full bg-black/5 px-2.5 py-1 font-medium dark:bg-white/10">{entry.quantity}</span>}
                          {entry.waterMl !== undefined && (
                            <span className="flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-1 font-medium text-sky-700 dark:text-sky-300">
                              <Droplets className="h-3 w-3" /> {entry.waterMl} ml
                            </span>
                          )}
                          {entry.treats && (
                            <span className="flex items-center gap-1 rounded-full bg-pink-500/10 px-2.5 py-1 font-medium text-pink-700 dark:text-pink-300">
                              <Cookie className="h-3 w-3" /> {entry.treats}
                            </span>
                          )}
                        </div>
                      )}
                      {entry.notes && <p className="mt-2 text-sm leading-6 text-muted-foreground">{entry.notes}</p>}
                    </article>
                  </li>
                )
              })}
            </ol>

            {missingMeals.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 pl-[3.25rem]">
                <span className="text-xs font-semibold text-muted-foreground">Still to log:</span>
                {missingMeals.map((meal) => (
                  <MealShortcut key={meal} meal={meal} onClick={() => onAdd(meal)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

function MealShortcut({ meal, onClick }: { meal: LoggerMealType; onClick: () => void }) {
  const Icon = mealIcons[meal]
  return (
    <button
      type="button"
      onClick={onClick}
      className="paw-field-glass inline-flex items-center gap-1.5 rounded-full border py-1.5 pl-1.5 pr-3 text-xs font-bold transition active:scale-95"
    >
      <span className={`flex h-6 w-6 items-center justify-center rounded-full ${mealTint[meal]}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <Plus className="-mr-0.5 h-3 w-3 text-muted-foreground" />
      {mealLabels[meal]}
    </button>
  )
}
