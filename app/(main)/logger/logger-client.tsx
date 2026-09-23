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
  Cat,
  Check,
  ChevronDown,
  ClipboardCheck,
  Dog,
  Droplets,
  Loader2,
  PawPrint,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  Utensils,
} from "lucide-react"
import { toast } from "sonner"

import { getUserProfile, type PetFeedEntry } from "@/firebase/firestore"
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
  const [petProfiles, setPetProfiles] = useState<PetFeedEntry[]>([])
  const [loadingPets, setLoadingPets] = useState(true)
  const [petPickerOpen, setPetPickerOpen] = useState(false)
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false)
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

  useEffect(() => {
    if (!user) {
      setPetProfiles([])
      setLoadingPets(false)
      return
    }

    let active = true
    setLoadingPets(true)

    getUserProfile(user.uid)
      .then((profile) => {
        if (!active) return
        const pets = profile?.petFeeds ?? []
        setPetProfiles(pets)
        setPetName((current) => current || pets[0]?.petName || "")
      })
      .catch((error) => {
        console.error("Unable to load saved pet profiles:", error)
        if (active) toast.error("Could not load your saved pets.")
      })
      .finally(() => {
        if (active) setLoadingPets(false)
      })

    return () => {
      active = false
    }
  }, [user])

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

  const selectedPet = useMemo(
    () => petProfiles.find((pet) => pet.petName === petName) ?? null,
    [petName, petProfiles]
  )

  const selectedKey = toDateKey(selectedDate)
  const selectedEntries = useMemo(
    () =>
      entries
        .filter((entry) => entry.loggedOn === selectedKey)
        .sort((a, b) => (a.loggedAt ?? "").localeCompare(b.loggedAt ?? "")),
    [entries, selectedKey]
  )

  const loggedDates = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.loggedOn))).map((value) => parseISO(value)),
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
    setMoreDetailsOpen(false)
    setPetPickerOpen(false)
    if (!petName) setPetName(petProfiles[0]?.petName || petNames[0] || "")
  }

  const handleSave = async () => {
    if (!user) return
    if (!petName.trim()) {
      toast.error("Choose a pet first.")
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
        <DialogContent className="logger-dialog max-h-[92vh] overflow-y-auto rounded-[2rem] border-orange-200/60 bg-background/95 p-0 shadow-2xl backdrop-blur-2xl sm:max-w-2xl dark:border-orange-950/60">
          <style>{`
            @keyframes logger-pop {
              0% { opacity: 0; transform: translateY(12px) scale(.985); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes logger-shimmer {
              0% { transform: translateX(-130%); }
              100% { transform: translateX(160%); }
            }
            @keyframes logger-float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-4px); }
            }
            .logger-enter { animation: logger-pop .28s cubic-bezier(.2,.8,.2,1) both; }
            .logger-float { animation: logger-float 2.8s ease-in-out infinite; }
          `}</style>

          <div className="relative overflow-hidden border-b border-orange-100 bg-gradient-to-br from-orange-50 via-amber-50/70 to-background p-6 dark:border-orange-950/50 dark:from-orange-950/25 dark:via-amber-950/10 dark:to-background sm:p-7">
            <div className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-orange-300/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 left-10 h-32 w-32 rounded-full bg-amber-300/20 blur-3xl" />
            <DialogHeader className="relative">
              <div className="mb-2 flex items-center gap-2">
                <span className="logger-float flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20">
                  <ClipboardCheck className="h-5 w-5" />
                </span>
                <div>
                  <DialogTitle className="text-2xl font-black">Log a meal</DialogTitle>
                  <DialogDescription>
                    {format(selectedDate, "EEEE, dd MMMM yyyy")}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="grid gap-5 p-6 sm:p-7">
            <div className="logger-enter relative z-20">
              <div className="mb-2 flex items-center justify-between gap-3">
                <Label className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">
                  Choose pet
                </Label>
                {petProfiles.length > 0 && (
                  <span className="text-[11px] font-bold text-emerald-600">
                    <Check className="mr-1 inline h-3 w-3" />
                    From Pet Feed
                  </span>
                )}
              </div>

              {loadingPets ? (
                <div className="flex h-16 items-center justify-center rounded-2xl border bg-muted/20">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-orange-500" />
                  <span className="text-sm text-muted-foreground">Loading your pets…</span>
                </div>
              ) : petProfiles.length > 0 ? (
                <div className="relative">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setPetPickerOpen((open) => !open)}
                    className={`group flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-lg hover:shadow-orange-500/10 ${
                      petPickerOpen
                        ? "border-orange-400 bg-orange-50/80 ring-4 ring-orange-500/10 dark:bg-orange-950/20"
                        : "border-border bg-background"
                    }`}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 text-orange-600 transition-transform duration-300 group-hover:scale-105 dark:from-orange-950 dark:to-amber-950">
                      {selectedPet?.petType?.toLowerCase().includes("cat") ? (
                        <Cat className="h-5 w-5" />
                      ) : selectedPet?.petType?.toLowerCase().includes("dog") ? (
                        <Dog className="h-5 w-5" />
                      ) : (
                        <PawPrint className="h-5 w-5" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black">
                        {selectedPet?.petName || "Select a pet"}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {selectedPet
                          ? [selectedPet.petType, selectedPet.petBreed].filter(Boolean).join(" · ")
                          : "Choose from pets already added in Pet Feed"}
                      </span>
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${
                        petPickerOpen ? "rotate-180 text-orange-500" : ""
                      }`}
                    />
                  </button>

                  {petPickerOpen && (
                    <div className="logger-enter absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-72 overflow-y-auto rounded-2xl border border-orange-200/70 bg-background/98 p-2 shadow-2xl shadow-orange-950/10 backdrop-blur-xl dark:border-orange-950/70">
                      <div className="grid gap-1.5">
                        {petProfiles.map((pet, index) => {
                          const selected = pet.petName === petName
                          const cat = pet.petType?.toLowerCase().includes("cat")
                          return (
                            <button
                              key={`${pet.petName}-${pet.petBreed}-${index}`}
                              type="button"
                              onClick={() => {
                                setPetName(pet.petName)
                                setPetPickerOpen(false)
                              }}
                              className={`flex items-center gap-3 rounded-xl p-3 text-left transition-all duration-200 hover:translate-x-1 ${
                                selected
                                  ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                                  : "hover:bg-orange-50 dark:hover:bg-orange-950/25"
                              }`}
                            >
                              <span
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                  selected ? "bg-white/20" : "bg-orange-100 text-orange-600 dark:bg-orange-950"
                                }`}
                              >
                                {cat ? <Cat className="h-4 w-4" /> : <Dog className="h-4 w-4" />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-black">{pet.petName}</span>
                                <span className={`block truncate text-xs ${selected ? "text-white/75" : "text-muted-foreground"}`}>
                                  {[pet.petType, pet.petBreed].filter(Boolean).join(" · ")}
                                </span>
                              </span>
                              {selected && <Check className="h-4 w-4" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/50 p-4 dark:border-orange-950 dark:bg-orange-950/10">
                  <p className="text-sm font-bold">No Pet Feed profile found</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    You can still use a pet name from earlier logger entries.
                  </p>
                  <Input
                    className="mt-3 rounded-xl bg-background"
                    list="logger-pet-names"
                    placeholder="Pet name"
                    value={petName}
                    onChange={(event) => setPetName(event.target.value)}
                    disabled={saving}
                  />
                  <datalist id="logger-pet-names">
                    {petNames.map((name) => <option key={name} value={name} />)}
                  </datalist>
                </div>
              )}
            </div>

            {selectedPet && (
              <div className="logger-enter flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] px-4 py-3">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  {selectedPet.petName} is ready
                </span>
                <span className="text-xs text-muted-foreground">
                  — pet details are already filled from Pet Feed.
                </span>
              </div>
            )}

            <div className="logger-enter grid gap-2" style={{ animationDelay: "40ms" }}>
              <Label htmlFor="logger-food" className="flex items-center justify-between gap-3">
                <span>What did {petName || "your pet"} eat?</span>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600">Required</span>
              </Label>
              <div className="group relative overflow-hidden rounded-2xl">
                <Utensils className="absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-orange-500" />
                <Input
                  id="logger-food"
                  autoFocus={Boolean(petName)}
                  placeholder="Chicken + rice, kibble, egg, curd…"
                  value={foodName}
                  onChange={(event) => setFoodName(event.target.value)}
                  disabled={saving}
                  className="h-13 rounded-2xl border-orange-200 bg-orange-50/35 pl-11 pr-4 text-base font-semibold transition-all duration-300 focus-visible:border-orange-400 focus-visible:ring-orange-500/15 dark:border-orange-950 dark:bg-orange-950/10"
                />
              </div>

              {selectedPet && (selectedPet.foodBrand || selectedPet.foodType) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="self-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Quick fill
                  </span>
                  {selectedPet.foodBrand && (
                    <button
                      type="button"
                      onClick={() => setFoodName(selectedPet.foodBrand || "")}
                      className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-orange-100 dark:border-orange-950 dark:bg-orange-950/20 dark:text-orange-300"
                    >
                      {selectedPet.foodBrand}
                    </button>
                  )}
                  {selectedPet.foodType && (
                    <button
                      type="button"
                      onClick={() => setFoodName(selectedPet.foodType || "")}
                      className="rounded-full border px-3 py-1.5 text-xs font-bold capitalize text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:text-orange-600"
                    >
                      {selectedPet.foodType}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="logger-enter grid grid-cols-2 gap-3" style={{ animationDelay: "80ms" }}>
              <div className="grid gap-2">
                <Label htmlFor="logger-meal" className="text-xs">Meal</Label>
                <div className="relative">
                  <select
                    id="logger-meal"
                    value={mealType}
                    onChange={(event) => setMealType(event.target.value as LoggerMealType)}
                    disabled={saving}
                    className="h-11 w-full appearance-none rounded-xl border border-input bg-background px-3 pr-9 text-sm font-bold shadow-sm outline-none transition-all duration-300 hover:border-orange-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10"
                  >
                    {mealOptions.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="logger-time" className="text-xs">Time</Label>
                <Input
                  id="logger-time"
                  type="time"
                  value={loggedAt}
                  onChange={(event) => setLoggedAt(event.target.value)}
                  disabled={saving}
                  className="h-11 rounded-xl transition-all duration-300 hover:border-orange-300 focus-visible:border-orange-400 focus-visible:ring-orange-500/10"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMoreDetailsOpen((open) => !open)}
              className="logger-enter flex items-center justify-between rounded-2xl border border-dashed p-3.5 text-left transition-all duration-300 hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-950/10"
              style={{ animationDelay: "120ms" }}
            >
              <span>
                <span className="block text-sm font-black">More details</span>
                <span className="block text-xs text-muted-foreground">Quantity, water, treats and notes — optional</span>
              </span>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${moreDetailsOpen ? "rotate-180 text-orange-500" : ""}`} />
            </button>

            <div
              className={`grid overflow-hidden transition-all duration-500 ease-out ${
                moreDetailsOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="min-h-0">
                <div className="grid gap-4 rounded-2xl bg-muted/20 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="logger-quantity">Quantity</Label>
                      <Input
                        id="logger-quantity"
                        placeholder={selectedPet?.dailyQuantity || "e.g. 180 g or 1 bowl"}
                        value={quantity}
                        onChange={(event) => setQuantity(event.target.value)}
                        disabled={saving}
                        className="rounded-xl"
                      />
                      {selectedPet?.dailyQuantity && !quantity && (
                        <button
                          type="button"
                          className="w-fit text-[11px] font-bold text-orange-600 hover:underline"
                          onClick={() => setQuantity(selectedPet.dailyQuantity || "")}
                        >
                          Use usual: {selectedPet.dailyQuantity}
                        </button>
                      )}
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
                        className="rounded-xl"
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
                      className="rounded-xl"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="logger-notes">Notes</Label>
                    <Textarea
                      id="logger-notes"
                      placeholder="Appetite, leftovers, reaction, stool changes…"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      disabled={saving}
                      rows={3}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl"
                onClick={() => setAddOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="relative overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 font-black text-white shadow-lg shadow-orange-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/25"
                onClick={handleSave}
                disabled={saving || !petName || !foodName.trim()}
              >
                <span className="relative z-10 flex items-center">
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  {saving ? "Saving…" : "Save meal"}
                </span>
              </Button>
            </div>          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
