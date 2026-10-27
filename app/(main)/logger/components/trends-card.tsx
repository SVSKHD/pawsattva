"use client"

import { useState } from "react"
import { format, parseISO } from "date-fns"
import { Loader2, Scale, TrendingUp } from "lucide-react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { PetWeightEntry } from "@/lib/logger-store"
import { scoreLabel } from "./shared"

interface TrendsCardProps {
  petName: string
  /** Shown when viewing all pets so the trend pet can be chosen here */
  petChoices: string[]
  onPetChange: (name: string) => void
  monthLabel: string
  qualityTrend: { date: string; score: number }[]
  weightEntries: PetWeightEntry[]
  loadingWeights: boolean
  weightDialogOpen: boolean
  onWeightDialogChange: (open: boolean) => void
  suggestedWeight: string
  onSaveWeight: (kg: number) => Promise<void>
}

const CHART_HEIGHT = "h-[240px]"
const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.7)",
  background: "rgba(255,255,255,0.85)",
  backdropFilter: "blur(12px)",
  boxShadow: "0 10px 30px -10px rgba(24,24,27,0.25)",
  fontSize: 12,
}

export function TrendsCard({
  petName, petChoices, onPetChange, monthLabel, qualityTrend, weightEntries, loadingWeights,
  weightDialogOpen, onWeightDialogChange, suggestedWeight, onSaveWeight,
}: TrendsCardProps) {
  const weightTrend = weightEntries.map((entry) => ({
    date: format(parseISO(entry.loggedOn), "dd MMM"),
    weight: entry.weightKg,
  }))
  const first = weightEntries[0]
  const last = weightEntries.at(-1)
  const change = first && last && weightEntries.length > 1 ? last.weightKg - first.weightKg : null

  return (
    <section className="paw-glass overflow-hidden rounded-3xl">
      <Tabs defaultValue="quality" className="gap-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/60 px-4 py-3 sm:px-5 dark:border-white/5">
          <h2 className="flex items-center gap-2 font-black">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Trends
            {petName && <span className="font-semibold text-muted-foreground">· {petName}</span>}
          </h2>
          {petChoices.length > 1 && (
            <div role="group" aria-label="Pet for trends" className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
              {petChoices.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onPetChange(name)}
                  aria-pressed={name === petName}
                  className={`h-7 shrink-0 rounded-full px-2.5 text-xs font-bold transition-all duration-300 ease-[var(--pf-ease)] ${
                    name === petName ? "bg-emerald-600 text-white" : "bg-black/5 text-muted-foreground hover:text-foreground dark:bg-white/10"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
          <TabsList className="ml-auto">
            <TabsTrigger value="quality" className="text-xs">Meal quality</TabsTrigger>
            <TabsTrigger value="weight" className="text-xs">Weight</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="quality" className="paw-fade mt-0 p-4 sm:p-5">
          <p className="mb-3 text-xs text-muted-foreground">Daily average of your ratings · {monthLabel}</p>
          {qualityTrend.length ? (
            <div className={`${CHART_HEIGHT} w-full`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={qualityTrend} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                  <defs>
                    <linearGradient id="logger-quality-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.16} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis
                    domain={[1, 3]}
                    ticks={[1, 2, 3]}
                    width={58}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value: number) => scoreLabel(value)}
                  />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [scoreLabel(Number(value)), "Daily quality"]} />
                  <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2.5} fill="url(#logger-quality-fill)" dot={{ r: 3, strokeWidth: 0, fill: "#10b981" }} activeDot={{ r: 5 }} animationDuration={700} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart icon={TrendingUp} title="No quality trend yet">
              Rate meals Healthy, Okay or Poor and the daily line builds itself.
            </EmptyChart>
          )}
        </TabsContent>

        <TabsContent value="weight" className="paw-fade mt-0 p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Last 90 days
              {last && <> · latest <strong className="text-foreground">{last.weightKg.toFixed(2)} kg</strong></>}
              {change !== null && (
                <> · <span className={change > 0 ? "text-amber-600" : change < 0 ? "text-sky-600" : ""}>
                  {change > 0 ? "+" : ""}{change.toFixed(2)} kg
                </span></>
              )}
            </p>
            {petName && (
              <Button type="button" size="sm" variant="ghost" className="paw-field-glass rounded-xl border" onClick={() => onWeightDialogChange(true)}>
                <Scale className="h-3.5 w-3.5" /> Log weight
              </Button>
            )}
          </div>
          {loadingWeights ? (
            <div className={`flex ${CHART_HEIGHT} items-center justify-center`}>
              <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
            </div>
          ) : weightTrend.length ? (
            <div className={`${CHART_HEIGHT} w-full`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weightTrend} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                  <defs>
                    <linearGradient id="logger-weight-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0284c7" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.16} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis width={48} tick={{ fontSize: 11 }} domain={["auto", "auto"]} tickFormatter={(value: number) => `${value}kg`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${Number(value).toFixed(2)} kg`, "Weight"]} />
                  <Area type="monotone" dataKey="weight" stroke="#0284c7" strokeWidth={2.5} fill="url(#logger-weight-fill)" dot={{ r: 3, strokeWidth: 0, fill: "#0284c7" }} activeDot={{ r: 5 }} animationDuration={700} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart icon={Scale} title="Start the weight trend">
              Log {petName || "your pet"} once a week to see gradual change instead of day-to-day noise.
            </EmptyChart>
          )}
        </TabsContent>
      </Tabs>

      {/* Remount on each open so the field starts from the latest suggestion */}
      <WeightDialog
        key={weightDialogOpen ? "open" : "closed"}
        open={weightDialogOpen}
        onOpenChange={onWeightDialogChange}
        petName={petName}
        initial={suggestedWeight}
        onSave={onSaveWeight}
      />
    </section>
  )
}

function EmptyChart({ icon: Icon, title, children }: { icon: typeof Scale; title: string; children: React.ReactNode }) {
  return (
    <div className={`flex ${CHART_HEIGHT} flex-col items-center justify-center rounded-2xl border border-dashed border-orange-300/50 bg-white/20 text-center dark:border-white/10 dark:bg-white/[0.02]`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-2 text-sm font-bold">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">{children}</p>
    </div>
  )
}

function WeightDialog({
  open, onOpenChange, petName, initial, onSave,
}: { open: boolean; onOpenChange: (open: boolean) => void; petName: string; initial: string; onSave: (kg: number) => Promise<void> }) {
  const [value, setValue] = useState(initial)
  const [saving, setSaving] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const kg = Number(value)
    if (!Number.isFinite(kg) || kg <= 0 || kg > 250) return
    setSaving(true)
    try {
      await onSave(kg)
      onOpenChange(false)
    } catch {
      // Error toast comes from the parent; keep the value so it can be retried
    } finally {
      setSaving(false)
    }
  }

  const valid = Number(value) > 0 && Number(value) <= 250

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="paw-liquid-glass rounded-[2rem] sm:max-w-sm">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-sky-600" />
              Weekly weight · {petName}
            </DialogTitle>
            <DialogDescription>Once a week is enough to see a useful trend.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="weekly-weight">Weight (kg)</Label>
            <Input
              id="weekly-weight"
              type="number"
              min="0.1"
              max="250"
              step="0.01"
              inputMode="decimal"
              placeholder="e.g. 12.40"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="paw-field-glass h-14 rounded-xl border text-center text-2xl font-black tabular-nums focus-visible:ring-0"
              autoFocus
            />
          </div>
          <Button type="submit" className="paw-cta h-11 rounded-xl font-bold text-white hover:text-white" disabled={saving || !valid}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save weight
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
