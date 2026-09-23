"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
} from "date-fns"
import {
  CalendarDays,
  ClipboardCheck,
  Droplets,
  Loader2,
  Plus,
  Share2,
  Trash2,
  Utensils,
} from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import {
  deletePetLoggerEntry,
  getPetLoggerEntries,
  type LoggerMealType,
  type PetLoggerEntry,
  savePetLoggerEntry,
} from "@/lib/logger-store"

const mealLabels: Record<LoggerMealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  supplement: "Supplement",
  other: "Other",
}

const mealOptions = Object.entries(mealLabels) as [LoggerMealType, string][]

const toDateKey = (date: Date) => format(date, "yyyy-MM-dd")

const currentTime = () =>
  new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })

export function LoggerClient() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [visibleMonth, setVisibleMonth] = useState(new Date())
  const [entries, setEntries] = useState<PetLoggerEntry[]>([])
  const [petNames, setPetNames] = useState<string[]>([])
  const [loadingEntries, setLoadingEntries] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [petName, setPetName] = useState("")
  const [mealType, setMealType] = useState<LoggerMealType>("breakfast")
  const [loggedAt, setLoggedAt] = useState(currentTime)
  const [foodName, setFoodName] = useState("")
  const [quantity, setQuantity] = useState("")
  const [waterMl, setWaterMl] = useState("")
  const [treats, setTreats] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?returnTo=/logger")
    }
  }, [authLoading, router, user])

  const loadMonth = useCallback(async () => {
    if (!user) return

    setLoadingEntries(true)
    try {
      const start = toDateKey(startOfMonth(visibleMonth))
      const end = toDateKey(endOfMonth(visibleMonth))
      const monthEntries = await getPetLoggerEntries(user.uid, start, end)
      setEntries(monthEntries)

      const names = Array.from(
        new Set(
          monthEntries
            .map((entry) => entry.petName.trim())
            .filter(Boolean)
        )
      ).sort()

      setPetNames((current) =>
        Array.from(new Set([...current, ...names])).sort()
      )
      setPetName((current) => current || names[0] || "")
    } catch (error) {
      console.error("Unable to load pet logger entries:", error)
      toast.error("Could not load this month’s pet logs.")
    } finally {
      setLoadingEntries(false)
    }
  }, [user, visibleMonth])

  useEffect(() => {
    void loadMonth()
  }, [loadMonth])

  const selectedKey = toDateKey(selectedDate)
  const selectedEntries = useMemo(
    () =>
      entries
        .filter((entry) => entry.loggedOn === selectedKey)
        .sort((a, b) => (a.loggedAt ?? "").localeCompare(b.loggedAt ?? "")),
    [entries, selectedKey]
  )

  const loggedDates = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.loggedOn))).map(parseISO),
    [entries]
  )

  const dayPets = useMemo(
    () => Array.from(new Set(selectedEntries.map((entry) => entry.petName))),
    [selectedEntries]
  )

  const resetForm = () => {
    setMealType("breakfast")
    setLoggedAt(currentTime())
    setFoodName("")
    setQuantity("")
    setWaterMl("")
    setTreats("")
    setNotes("")
    if (!petName && petNames[0]) setPetName(petNames[0])
  }

  const handleSave = async () => {
    if (!user) return
    if (!petName.trim()) {
      toast.error("Add the pet’s name.")
      return
    }
    if (!foodName.trim()) {
      toast.error("Add what your pet ate.")
      return
    }

    const parsedWater = waterMl.trim() ? Number(waterMl) : undefined
    if (parsedWater !== undefined && (!Number.isFinite(parsedWater) || parsedWater < 0)) {
      toast.error("Water must be a valid amount in ml.")
      return
    }

    setSaving(true)
    try {
      const saved = await savePetLoggerEntry({
        userId: user.uid,
        loggedOn: selectedKey,
        petName: petName.trim(),
        mealType,
        loggedAt: loggedAt || undefined,
        foodName: foodName.trim(),
        quantity: quantity.trim() || undefined,
        waterMl: parsedWater,
        treats: treats.trim() || undefined,
        notes: notes.trim() || undefined,
      })

      setEntries((current) => [saved, ...current])
      if (!petNames.includes(saved.petName)) {
        setPetNames((current) => [...current, saved.petName].sort())
      }
      setAddOpen(false)
      resetForm()
      toast.success("Pet food log saved.")
    } catch (error) {
      console.error("Unable to save pet logger entry:", error)
      toast.error("Could not save this food log.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (entry: PetLoggerEntry) => {
    if (!user) return

    setDeletingId(entry.id)
    try {
      await deletePetLoggerEntry(entry.id, user.uid)
      setEntries((current) => current.filter((item) => item.id !== entry.id))
      toast.success("Log entry removed.")
    } catch (error) {
      console.error("Unable to delete logger entry:", error)
      toast.error("Could not remove this log entry.")
    } finally {
      setDeletingId(null)
    }
  }

  const shareDay = async () => {
    if (!selectedEntries.length) return

    const lines = selectedEntries.map((entry) => {
      const time = entry.loggedAt ? ` at ${entry.loggedAt}` : ""
      const amount = entry.quantity ? ` — ${entry.quantity}` : ""
      const water = entry.waterMl !== undefined ? ` | Water: ${entry.waterMl} ml` : ""
      const treat = entry.treats ? ` | Treats: ${entry.treats}` : ""
      return `• ${entry.petName}: ${mealLabels[entry.mealType]}${time} — ${entry.foodName}${amount}${water}${treat}`
    })

    const text = [
      `PawSattva Pet Food Log — ${format(selectedDate, "dd MMM yyyy")}`,
      "",
      ...lines,
      "",
      "Shared from pawsattva.com/logger",
    ].join("\n")

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Pet food log — ${format(selectedDate, "dd MMM yyyy")}`,
          text,
        })
      } else {
        await navigator.clipboard.writeText(text)
        toast.success("Daily food summary copied.")
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return
      try {
        await navigator.clipboard.writeText(text)
        toast.success("Daily food summary copied.")
      } catch {
        toast.error("Could not share this summary.")
      }
    }
  }

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-28 sm:px-6 md:pt-32 lg:px-8">
      <section className="mb-8 overflow-hidden rounded-[2rem] border border-orange-100 bg-gradient-to-br from-orange-50 via-background to-amber-50 p-6 shadow-sm dark:border-orange-950/50 dark:from-orange-950/25 dark:to-background sm:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
              <CalendarDays className="h-4 w-4" />
              Private pet diary
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Food Logger
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              Keep a day-by-day record of what each pet eats, then share a clean food summary with your family, veterinarian, or nutritionist.
            </p>
          </div>

          <Button
            type="button"
            size="lg"
            className="rounded-2xl font-bold"
            onClick={() => {
              resetForm()
              setAddOpen(true)
            }}
          >
            <Plus className="mr-2 h-5 w-5" />
            Add food log
          </Button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="h-fit rounded-[1.75rem] border-orange-100/70 shadow-sm dark:border-orange-950/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-orange-600" />
              Calendar
            </CardTitle>
            <CardDescription>
              Dates with saved logs are highlighted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              month={visibleMonth}
              onMonthChange={setVisibleMonth}
              onSelect={(date) => date && setSelectedDate(date)}
              modifiers={{ logged: loggedDates }}
              modifiersClassNames={{
                logged:
                  "font-black text-orange-700 dark:text-orange-300 bg-orange-50/80 dark:bg-orange-950/30",
              }}
              className="mx-auto w-full"
            />
            {loadingEntries && (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading this month…
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="rounded-[1.75rem] border-orange-100/70 shadow-sm dark:border-orange-950/50">
            <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{format(selectedDate, "EEEE, dd MMMM")}</CardTitle>
                <CardDescription>
                  {selectedEntries.length
                    ? `${selectedEntries.length} log${selectedEntries.length === 1 ? "" : "s"} across ${dayPets.length} pet${dayPets.length === 1 ? "" : "s"}`
                    : "No food logs yet for this day."}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={shareDay}
                  disabled={!selectedEntries.length}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share day
                </Button>
                <Button
                  type="button"
                  className="rounded-xl"
                  onClick={() => {
                    resetForm()
                    setAddOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>
            </CardHeader>
          </Card>

          {!selectedEntries.length && !loadingEntries ? (
            <Card className="rounded-[1.75rem] border-dashed py-10 text-center">
              <CardContent className="flex flex-col items-center">
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300">
                  <Utensils className="h-7 w-7" />
                </span>
                <h2 className="text-lg font-bold">Start this day’s food diary</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Log meals, quantities, water, treats, and useful notes. You can share the whole day as one readable summary.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {selectedEntries.map((entry) => (
                <Card key={entry.id} className="rounded-[1.5rem]">
                  <CardContent className="p-5">
                    <div className="flex gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300">
                        <Utensils className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-orange-600">
                              {entry.petName} · {mealLabels[entry.mealType]}
                              {entry.loggedAt ? ` · ${entry.loggedAt}` : ""}
                            </p>
                            <h3 className="mt-1 text-lg font-bold">{entry.foodName}</h3>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="rounded-full text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(entry)}
                            disabled={deletingId === entry.id}
                            aria-label="Delete food log"
                          >
                            {deletingId === entry.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          {entry.quantity && (
                            <span className="rounded-full bg-muted px-3 py-1.5 font-medium">
                              {entry.quantity}
                            </span>
                          )}
                          {entry.waterMl !== undefined && (
                            <span className="flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1.5 font-medium text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
                              <Droplets className="h-3.5 w-3.5" />
                              {entry.waterMl} ml water
                            </span>
                          )}
                          {entry.treats && (
                            <span className="rounded-full bg-amber-50 px-3 py-1.5 font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                              Treats: {entry.treats}
                            </span>
                          )}
                        </div>

                        {entry.notes && (
                          <p className="mt-3 rounded-xl bg-muted/50 p-3 text-sm leading-6 text-muted-foreground">
                            {entry.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={(open) => !saving && setAddOpen(open)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[2rem] p-6 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <ClipboardCheck className="h-6 w-6 text-orange-600" />
              Add food log
            </DialogTitle>
            <DialogDescription>
              Logging for {format(selectedDate, "dd MMMM yyyy")}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <div className="grid gap-2">
              <Label htmlFor="logger-pet">Pet name</Label>
              <Input
                id="logger-pet"
                list="logger-pet-names"
                placeholder="e.g. Bruno"
                value={petName}
                onChange={(event) => setPetName(event.target.value)}
                disabled={saving}
              />
              <datalist id="logger-pet-names">
                {petNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="logger-meal">Meal</Label>
                <select
                  id="logger-meal"
                  value={mealType}
                  onChange={(event) => setMealType(event.target.value as LoggerMealType)}
                  disabled={saving}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {mealOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="logger-time">Time</Label>
                <Input
                  id="logger-time"
                  type="time"
                  value={loggedAt}
                  onChange={(event) => setLoggedAt(event.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="logger-food">Food / recipe</Label>
              <Input
                id="logger-food"
                placeholder="e.g. chicken, rice, pumpkin and egg"
                value={foodName}
                onChange={(event) => setFoodName(event.target.value)}
                disabled={saving}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="logger-quantity">Quantity</Label>
                <Input
                  id="logger-quantity"
                  placeholder="e.g. 180 g or 1 bowl"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="logger-water">Water (ml)</Label>
                <Input
                  id="logger-water"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 250"
                  value={waterMl}
                  onChange={(event) => setWaterMl(event.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="logger-treats">Treats / extras</Label>
              <Input
                id="logger-treats"
                placeholder="e.g. 2 dental chews"
                value={treats}
                onChange={(event) => setTreats(event.target.value)}
                disabled={saving}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="logger-notes">Notes</Label>
              <Textarea
                id="logger-notes"
                placeholder="Appetite, leftovers, unusual reaction, stool changes, etc."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={saving}
                rows={4}
              />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setAddOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl font-bold"
                onClick={handleSave}
                disabled={saving}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save food log
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
