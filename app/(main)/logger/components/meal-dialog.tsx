"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Cat, Check, ChevronDown, Dog, Loader2, Utensils } from "lucide-react"
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
import { currentTime, isCat, mealForNow, mealOptions, qualityLabels, type LoggerPet } from "./shared"

export type MealDraft = Omit<NewPetLoggerEntry, "userId" | "loggedOn">

interface MealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date
  pets: LoggerPet[]
  defaultPetName: string
  /** Prefill from an existing entry ("Log again") */
  template?: PetLoggerEntry | null
  /** Meal to preselect (e.g. from the empty-day shortcuts) */
  initialMeal?: LoggerMealType
  onSave: (draft: MealDraft) => Promise<void>
}

const qualityActive: Record<FeedQuality, string> = {
  healthy: "border-emerald-500 bg-emerald-500 text-white",
  okay: "border-amber-500 bg-amber-500 text-white",
  poor: "border-rose-500 bg-rose-500 text-white",
}

export function MealDialog({ open, onOpenChange, date, pets, defaultPetName, template, initialMeal, onSave }: MealDialogProps) {
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

  const quickFills = [pet?.foodBrand, pet?.foodType].filter((v): v is string => Boolean(v?.trim()))

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl p-0 sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle className="flex items-center gap-2 text-xl font-black">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white">
                <Utensils className="h-4 w-4" />
              </span>
              {template ? "Log again" : "Log a meal"}
            </DialogTitle>
            <DialogDescription>{format(date, "EEEE, dd MMMM yyyy")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 px-6 py-5">
            {/* Pet */}
            <div className="grid gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pet</Label>
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
                        className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-bold transition ${
                          active
                            ? "border-orange-500 bg-orange-500 text-white shadow-sm shadow-orange-500/20"
                            : "bg-background hover:border-orange-300"
                        }`}
                      >
                        {isCat(p) ? <Cat className="h-4 w-4" /> : <Dog className="h-4 w-4" />}
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
                  className="h-11 rounded-xl"
                />
              )}
            </div>

            {/* Food */}
            <div className="grid gap-2">
              <Label htmlFor="logger-food" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                What did {petName || "your pet"} eat?
              </Label>
              <Input
                id="logger-food"
                autoFocus
                placeholder="Chicken + rice, kibble, egg, curd…"
                value={foodName}
                onChange={(event) => setFoodName(event.target.value)}
                className="h-12 rounded-xl text-base font-semibold"
              />
              {quickFills.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground">Usual:</span>
                  {quickFills.map((fill) => (
                    <button
                      key={fill}
                      type="button"
                      onClick={() => setFoodName(fill)}
                      className="rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-semibold capitalize text-orange-700 transition hover:bg-orange-500/20 dark:text-orange-300"
                    >
                      {fill}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Meal + time */}
            <div className="grid gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Meal</Label>
              <div className="flex flex-wrap items-center gap-1.5">
                {mealOptions.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMealType(value)}
                    aria-pressed={mealType === value}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      mealType === value ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <Input
                  type="time"
                  aria-label="Time"
                  value={loggedAt}
                  onChange={(event) => setLoggedAt(event.target.value)}
                  className="ml-auto h-8 w-[110px] rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Quality */}
            <div className="grid gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">How was this meal?</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["healthy", "okay", "poor"] as FeedQuality[]).map((quality) => (
                  <button
                    key={quality}
                    type="button"
                    onClick={() => setFeedQuality(quality)}
                    aria-pressed={feedQuality === quality}
                    className={`rounded-xl border py-2.5 text-sm font-bold transition ${
                      feedQuality === quality ? qualityActive[quality] : "bg-background text-muted-foreground hover:border-orange-300"
                    }`}
                  >
                    {qualityLabels[quality]}
                  </button>
                ))}
              </div>
              <p className="text-[11px] leading-4 text-muted-foreground">
                Your own rating — it drives the quality trend. PawSattva doesn&apos;t judge food from its name.
              </p>
            </div>

            {/* Optional details */}
            <div className="rounded-2xl border">
              <button
                type="button"
                onClick={() => setDetailsOpen((value) => !value)}
                aria-expanded={detailsOpen}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-sm font-bold">
                  More details <span className="font-normal text-muted-foreground">· quantity, water, treats, notes</span>
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
              </button>
              {detailsOpen && (
                <div className="grid gap-4 border-t px-4 py-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="logger-quantity" className="text-xs">Quantity</Label>
                      <Input
                        id="logger-quantity"
                        placeholder={pet?.dailyQuantity || "e.g. 180 g or 1 bowl"}
                        value={quantity}
                        onChange={(event) => setQuantity(event.target.value)}
                        className="rounded-xl"
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
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="logger-treats" className="text-xs">Treats / extras</Label>
                    <Input
                      id="logger-treats"
                      placeholder="e.g. 2 dental chews"
                      value={treats}
                      onChange={(event) => setTreats(event.target.value)}
                      className="rounded-xl"
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
                      className="rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-xl bg-orange-500 px-6 font-bold text-white hover:bg-orange-600"
              disabled={saving || !petName.trim() || !foodName.trim()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? "Saving…" : "Save meal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
