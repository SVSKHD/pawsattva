"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Cat, Check, ChevronDown, Clock, Dog, Frown, History, Loader2, Meh, Smile, Utensils } from "lucide-react"
import { toast } from "sonner"

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
import { Textarea } from "@/components/ui/textarea"
import type { FeedQuality, LoggerMealType, NewPetLoggerEntry, PetLoggerEntry } from "@/lib/logger-store"
import { currentTime, isCat, mealForNow, mealIcons, mealOptions, mealTint, qualityLabels, type LoggerPet } from "./shared"

export type MealDraft = Omit<NewPetLoggerEntry, "userId" | "loggedOn">

interface MealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date
  pets: LoggerPet[]
  defaultPetName: string
  /** Each pet's recently logged foods, newest first, offered as one-tap fills */
  recentFoods?: Record<string, string[]>
  /** Prefill from an existing entry ("Log again") */
  template?: PetLoggerEntry | null
  /** Meal to preselect (e.g. from the empty-day shortcuts) */
  initialMeal?: LoggerMealType
  onSave: (draft: MealDraft) => Promise<void>
}

const qualityOptions: { value: FeedQuality; icon: typeof Smile; hint: string; active: string }[] = [
  { value: "healthy", icon: Smile, hint: "Ate well", active: "border-emerald-500 bg-emerald-500 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_18px_-8px_rgba(16,185,129,0.7)]" },
  { value: "okay", icon: Meh, hint: "Some left", active: "border-amber-500 bg-amber-500 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_18px_-8px_rgba(245,158,11,0.7)]" },
  { value: "poor", icon: Frown, hint: "Refused / upset", active: "border-rose-500 bg-rose-500 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_18px_-8px_rgba(244,63,94,0.7)]" },
]

const WATER_PICKS = [100, 250, 500]
const fieldClass = "paw-field-glass rounded-xl border focus-visible:ring-0"
const sectionLabel = "text-xs font-bold uppercase tracking-wider text-muted-foreground"

export function MealDialog({ open, onOpenChange, date, pets, defaultPetName, recentFoods, template, initialMeal, onSave }: MealDialogProps) {
  const [saving, setSaving] = useState(false)
  const [petName, setPetName] = useState("")
  const [foodName, setFoodName] = useState("")
  const [mealType, setMealType] = useState<LoggerMealType>("breakfast")
  const [loggedAt, setLoggedAt] = useState("")
  const [feedQuality, setFeedQuality] = useState<FeedQuality>("okay")
  const [quantity, setQuantity] = useState("")
  const [waterMl, setWaterMl] = useState("")
  const [treats, setTreats] = useState("")
  const [notes, setNotes] = useState("")
  const [detailsOpen, setDetailsOpen] = useState(false)

  // Reset (or prefill) every time the dialog opens
  useEffect(() => {
    if (!open) return
    setPetName(template?.petName || defaultPetName || pets[0]?.name || "")
    setFoodName(template?.foodName || "")
    setMealType(template?.mealType || initialMeal || mealForNow())
    setLoggedAt(currentTime())
    setFeedQuality(template?.feedQuality || "okay")
    setQuantity(template?.quantity || "")
    setWaterMl(template?.waterMl !== undefined ? String(template.waterMl) : "")
    setTreats(template?.treats || "")
    setNotes("")
    setDetailsOpen(Boolean(template?.quantity || template?.waterMl !== undefined || template?.treats))
  }, [open, template, initialMeal, defaultPetName, pets])

  const pet = pets.find((p) => p.name === petName) ?? null

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!petName.trim()) return void toast.error("Choose a pet first.")
    if (!foodName.trim()) return void toast.error("Add what your pet ate.")
    const parsedWater = waterMl.trim() ? Number(waterMl) : undefined
    if (parsedWater !== undefined && (!Number.isFinite(parsedWater) || parsedWater < 0)) {
      return void toast.error("Water must be a valid amount in ml.")
    }

    setSaving(true)
    try {
      await onSave({
        petName: petName.trim(),
        mealType,
        loggedAt: loggedAt || undefined,
        foodName: foodName.trim(),
        feedQuality,
        quantity: quantity.trim() || undefined,
        waterMl: parsedWater,
        treats: treats.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      onOpenChange(false)
    } catch {
      // The parent already showed an error toast; keep the dialog open so nothing typed is lost
    } finally {
      setSaving(false)
    }
  }

  // Recent foods first, then the usual food from Pet Feed; no repeats, a handful at most
  const quickFills = Array.from(
    new Map(
      [...(recentFoods?.[petName] ?? []), pet?.foodBrand, pet?.foodType]
        .filter((value): value is string => Boolean(value?.trim()))
        .map((value) => [value.trim().toLowerCase(), value.trim()] as const)
    ).values()
  ).slice(0, 5)
  const detailCount = [quantity, waterMl, treats, notes].filter((value) => value.trim()).length

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="paw-liquid-glass max-h-[92vh] gap-0 overflow-y-auto rounded-[2rem] p-0 sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader className="border-b border-white/60 px-6 py-5 dark:border-white/5">
            <DialogTitle className="flex items-center gap-2.5 text-xl font-black">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-b from-orange-400 to-orange-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_18px_-8px_rgba(249,115,22,0.7)]">
                <Utensils className="h-4 w-4" />
              </span>
              {template ? "Log again" : "Log a meal"}
            </DialogTitle>
            <DialogDescription>{format(date, "EEEE, dd MMMM yyyy")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 px-6 py-5">
            {/* Pet */}
            <div className="grid gap-2">
              <Label className={sectionLabel}>Pet</Label>
              {pets.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {pets.map((p) => {
                    const active = p.name === petName
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setPetName(p.name)}
                        aria-pressed={active}
                        data-selected={active}
                        className="paw-field-glass inline-flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-sm font-bold"
                      >
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${active ? "bg-orange-500 text-white" : "bg-orange-500/10 text-orange-600"}`}>
                          {isCat(p) ? <Cat className="h-4 w-4" /> : <Dog className="h-4 w-4" />}
                        </span>
                        {p.name}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <Input
                  placeholder="Pet name"
                  value={petName}
                  onChange={(event) => setPetName(event.target.value)}
                  className={`h-11 ${fieldClass}`}
                />
              )}
            </div>

            {/* Food */}
            <div className="grid gap-2">
              <Label htmlFor="logger-food" className={sectionLabel}>
                What did {petName || "your pet"} eat?
              </Label>
              <Input
                id="logger-food"
                autoFocus
                autoComplete="off"
                placeholder="Chicken + rice, kibble, egg, curd…"
                value={foodName}
                onChange={(event) => setFoodName(event.target.value)}
                className={`h-12 text-base font-semibold ${fieldClass}`}
              />
              {quickFills.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-muted-foreground" aria-label="Recent" />
                  {quickFills.map((fill) => {
                    const active = fill.toLowerCase() === foodName.trim().toLowerCase()
                    return (
                      <button
                        key={fill}
                        type="button"
                        onClick={() => setFoodName(fill)}
                        aria-pressed={active}
                        className={`max-w-[12rem] truncate rounded-full px-2.5 py-1 text-xs font-semibold transition active:scale-95 ${
                          active ? "bg-orange-500 text-white" : "bg-orange-500/10 text-orange-700 hover:bg-orange-500/20 dark:text-orange-300"
                        }`}
                      >
                        {fill}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Meal + time */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label className={sectionLabel}>Meal</Label>
                <label className="paw-field-glass flex h-8 items-center gap-1.5 rounded-lg border px-2 text-xs font-semibold">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="sr-only">Time</span>
                  <input type="time" value={loggedAt} onChange={(event) => setLoggedAt(event.target.value)} className="bg-transparent tabular-nums outline-none" />
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {mealOptions.map(([value, label]) => {
                  const Icon = mealIcons[value]
                  const active = mealType === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMealType(value)}
                      aria-pressed={active}
                      data-selected={active}
                      className="paw-field-glass flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-bold"
                    >
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${active ? "bg-orange-500 text-white" : mealTint[value]}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Quality */}
            <div className="grid gap-2">
              <Label className={sectionLabel}>How was this meal?</Label>
              <div className="grid grid-cols-3 gap-2">
                {qualityOptions.map(({ value, icon: Icon, hint, active }) => {
                  const selected = feedQuality === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFeedQuality(value)}
                      aria-pressed={selected}
                      className={`flex flex-col items-center gap-0.5 rounded-xl border py-2.5 transition-all duration-300 ease-[var(--pf-ease)] active:scale-95 ${selected ? active : "paw-field-glass text-muted-foreground"}`}
                    >
                      <Icon className={`h-5 w-5 transition-transform duration-300 ${selected ? "scale-110" : ""}`} />
                      <span className="text-sm font-bold">{qualityLabels[value]}</span>
                      <span className={`text-[10px] font-medium ${selected ? "text-white/85" : "text-muted-foreground"}`}>{hint}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] leading-4 text-muted-foreground">
                Your own rating. It drives the quality trend; PawSattva doesn&apos;t judge food from its name.
              </p>
            </div>

            {/* Optional details */}
            <div className="paw-field-glass overflow-hidden rounded-2xl border">
              <button
                type="button"
                onClick={() => setDetailsOpen((value) => !value)}
                aria-expanded={detailsOpen}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-sm font-bold">
                  More details{" "}
                  {detailCount > 0 ? (
                    <span className="ml-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{detailCount}</span>
                  ) : (
                    <span className="font-normal text-muted-foreground">· quantity, water, treats, notes</span>
                  )}
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ease-[var(--pf-ease)] ${detailsOpen ? "rotate-180" : ""}`} />
              </button>
              {/* Grid rows animate the height open and closed */}
              <div className={`grid transition-[grid-template-rows] duration-300 ease-[var(--pf-ease)] ${detailsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="min-h-0 overflow-hidden" inert={!detailsOpen}>
                  <div className="grid gap-4 border-t border-white/60 px-4 py-4 dark:border-white/5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <Label htmlFor="logger-quantity" className="text-xs">Quantity</Label>
                        <Input
                          id="logger-quantity"
                          placeholder={pet?.dailyQuantity || "e.g. 180 g or 1 bowl"}
                          value={quantity}
                          onChange={(event) => setQuantity(event.target.value)}
                          className={fieldClass}
                        />
                        {pet?.dailyQuantity && !quantity && (
                          <button
                            type="button"
                            className="w-fit text-[11px] font-bold text-orange-600 hover:underline"
                            onClick={() => setQuantity(pet.dailyQuantity || "")}
                          >
                            Use usual: {pet.dailyQuantity}
                          </button>
                        )}
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="logger-water" className="text-xs">Water (ml)</Label>
                        <Input
                          id="logger-water"
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          placeholder="e.g. 250"
                          value={waterMl}
                          onChange={(event) => setWaterMl(event.target.value)}
                          className={fieldClass}
                        />
                        <div className="flex gap-1">
                          {WATER_PICKS.map((ml) => (
                            <button
                              key={ml}
                              type="button"
                              onClick={() => setWaterMl(String(ml))}
                              aria-pressed={waterMl === String(ml)}
                              className={`rounded-full px-2 py-0.5 text-[11px] font-bold transition active:scale-95 ${
                                waterMl === String(ml) ? "bg-sky-500 text-white" : "bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 dark:text-sky-300"
                              }`}
                            >
                              {ml} ml
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="logger-treats" className="text-xs">Treats / extras</Label>
                      <Input
                        id="logger-treats"
                        placeholder="e.g. 2 dental chews"
                        value={treats}
                        onChange={(event) => setTreats(event.target.value)}
                        className={fieldClass}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="logger-notes" className="text-xs">Notes</Label>
                      <Textarea
                        id="logger-notes"
                        placeholder="Appetite, leftovers, reaction, stool changes…"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        rows={3}
                        className={fieldClass}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-white/60 bg-white/60 px-6 py-4 backdrop-blur-xl sm:flex-row sm:justify-end dark:border-white/5 dark:bg-zinc-900/60">
            <Button type="button" variant="ghost" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="paw-cta h-11 rounded-xl px-6 font-bold text-white hover:text-white"
              disabled={saving || !petName.trim() || !foodName.trim()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? "Saving…" : `Save ${mealOptions.find(([value]) => value === mealType)?.[1].toLowerCase() ?? "meal"}${petName ? ` for ${petName}` : ""}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
