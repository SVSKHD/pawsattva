"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subDays,
} from "date-fns"
import {
  AlertTriangle,
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
  RefreshCw,
  Scale,
  Share2,
  Sparkles,
  TrendingUp,
  Trash2,
  Utensils,
} from "lucide-react"
import { toast } from "sonner"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { getUserProfile, type PetFeedEntry } from "@/firebase/firestore"
import {
  isFirebaseSqlUnavailableError,
  resetFirebaseSqlUnavailableState,
} from "@/lib/firebase-sql-connect"
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
  getPetWeightEntries,
  type FeedQuality,
  type LoggerMealType,
  type PetLoggerEntry,
  type PetWeightEntry,
  savePetLoggerEntry,
  savePetWeightEntry,
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

const qualityLabels: Record<FeedQuality, string> = {
  healthy: "Healthy",
  okay: "Okay",
  poor: "Poor",
}

const qualityScores: Record<FeedQuality, number> = {
  healthy: 3,
  okay: 2,
  poor: 1,
}

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
  const [trendPetName, setTrendPetName] = useState("")
  const [weightEntries, setWeightEntries] = useState<PetWeightEntry[]>([])
  const [loadingWeights, setLoadingWeights] = useState(false)
  const [weightOpen, setWeightOpen] = useState(false)
  const [weightKg, setWeightKg] = useState("")
  const [savingWeight, setSavingWeight] = useState(false)
  const [loadingEntries, setLoadingEntries] = useState(true)
  const [databaseUnavailable, setDatabaseUnavailable] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [petName, setPetName] = useState("")
  const [feedQuality, setFeedQuality] = useState<FeedQuality>("okay")
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
        setTrendPetName((current) => current || pets[0]?.petName || "")
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
    if (!user || databaseUnavailable) return

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
      if (isFirebaseSqlUnavailableError(error)) {
        setDatabaseUnavailable(true)
        setEntries([])
      } else {
        console.error("Unable to load pet logger entries:", error)
        toast.error("Could not load this month’s pet logs.")
      }
    } finally {
      setLoadingEntries(false)
    }
  }, [databaseUnavailable, user, visibleMonth])

  useEffect(() => {
    void loadMonth()
  }, [loadMonth])

  const loadWeights = useCallback(async () => {
    if (!user || !trendPetName || databaseUnavailable) {
      setWeightEntries([])
      return
    }

    setLoadingWeights(true)
    try {
      const end = new Date()
      const start = subDays(end, 90)
      const weights = await getPetWeightEntries(
        user.uid,
        trendPetName,
        toDateKey(start),
        toDateKey(end)
      )
      setWeightEntries(weights)
    } catch (error) {
      if (isFirebaseSqlUnavailableError(error)) {
        setDatabaseUnavailable(true)
        setWeightEntries([])
      } else {
        console.error("Unable to load pet weight history:", error)
        toast.error("Could not load weight history.")
      }
    } finally {
      setLoadingWeights(false)
    }
  }, [databaseUnavailable, trendPetName, user])

  useEffect(() => {
    void loadWeights()
  }, [loadWeights])

  const selectedPet = useMemo(
    () => petProfiles.find((pet) => pet.petName === petName) ?? null,
    [petName, petProfiles]
  )

  const trendPet = useMemo(
    () => petProfiles.find((pet) => pet.petName === trendPetName) ?? null,
    [petProfiles, trendPetName]
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

  const qualityTrend = useMemo(() => {
    const byDay = new Map<string, { total: number; count: number }>()

    entries
      .filter((entry) => entry.petName === trendPetName && entry.feedQuality)
      .forEach((entry) => {
        const score = qualityScores[entry.feedQuality as FeedQuality]
        const current = byDay.get(entry.loggedOn) || { total: 0, count: 0 }
        current.total += score
        current.count += 1
        byDay.set(entry.loggedOn, current)
      })

    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({
        date: format(parseISO(date), "dd MMM"),
        score: Number((value.total / value.count).toFixed(2)),
      }))
  }, [entries, trendPetName])

  const weightTrend = useMemo(
    () =>
      weightEntries.map((entry) => ({
        date: format(parseISO(entry.loggedOn), "dd MMM"),
        weight: entry.weightKg,
      })),
    [weightEntries]
  )

  const lastWeight = weightEntries.at(-1)
  const needsWeightCheckIn = useMemo(() => {
    if (!trendPetName) return false
    if (!lastWeight) return true
    return differenceInCalendarDays(new Date(), parseISO(lastWeight.loggedOn)) >= 7
  }, [lastWeight, trendPetName])

  const resetForm = () => {
    setFeedQuality("okay")
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
        feedQuality,
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
      toast.success("Meal logged and nutrition trend updated.")
    } catch (error) {
      if (isFirebaseSqlUnavailableError(error)) {
        setDatabaseUnavailable(true)
        toast.error("Pet logger database is temporarily unavailable.")
      } else {
        console.error("Unable to save pet logger entry:", error)
        toast.error("Could not save this food log.")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleWeightSave = async () => {
    if (!user || !trendPetName) return

    const parsedWeight = Number(weightKg)
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0 || parsedWeight > 250) {
      toast.error("Enter a valid weight in kg.")
      return
    }

    setSavingWeight(true)
    try {
      const saved = await savePetWeightEntry({
        userId: user.uid,
        petName: trendPetName,
        loggedOn: toDateKey(new Date()),
        weightKg: parsedWeight,
      })
      setWeightEntries((current) =>
        [...current.filter((entry) => entry.loggedOn !== saved.loggedOn), saved]
          .sort((a, b) => a.loggedOn.localeCompare(b.loggedOn))
      )
      setWeightKg("")
      setWeightOpen(false)
      toast.success(`${trendPetName}'s weekly weight was logged.`)
    } catch (error) {
      if (isFirebaseSqlUnavailableError(error)) {
        setDatabaseUnavailable(true)
        toast.error("Pet logger database is temporarily unavailable.")
      } else {
        console.error("Unable to save pet weight:", error)
        toast.error("Could not save this weight.")
      }
    } finally {
      setSavingWeight(false)
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
      if (isFirebaseSqlUnavailableError(error)) {
        setDatabaseUnavailable(true)
        toast.error("Pet logger database is temporarily unavailable.")
      } else {
        console.error("Unable to delete logger entry:", error)
        toast.error("Could not remove this log entry.")
      }
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
      const quality = entry.feedQuality ? ` | Quality: ${qualityLabels[entry.feedQuality]}` : ""
      return `• ${entry.petName}: ${mealLabels[entry.mealType]}${time} — ${entry.foodName}${amount}${water}${treat}${quality}`
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

  const retryDatabase = () => {
    resetFirebaseSqlUnavailableState()
    setDatabaseUnavailable(false)
    setTimeout(() => {
      void loadMonth()
      void loadWeights()
    }, 0)
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
            disabled={databaseUnavailable}
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

      {databaseUnavailable && (
        <Card className="mb-6 overflow-hidden rounded-[1.6rem] border-amber-300/70 bg-gradient-to-r from-amber-50 via-orange-50 to-background shadow-sm dark:border-amber-900/60 dark:from-amber-950/20 dark:via-orange-950/10">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <p className="font-black">Pet logger database is temporarily unavailable</p>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                  Your Pet Feed profiles are still available, but meal history and weekly weights cannot be read or saved until the logger database service is active.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl font-bold"
              onClick={retryDatabase}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry database
            </Button>
          </CardContent>
        </Card>
      )}

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
                  disabled={databaseUnavailable}
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
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-bold">{entry.foodName}</h3>
                              {entry.feedQuality && (
                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                                  entry.feedQuality === "healthy"
                                    ? "bg-emerald-500/10 text-emerald-600"
                                    : entry.feedQuality === "poor"
                                      ? "bg-rose-500/10 text-rose-600"
                                      : "bg-amber-500/10 text-amber-600"
                                }`}>
                                  {qualityLabels[entry.feedQuality]}
                                </span>
                              )}
                            </div>
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

      <section className="mt-7 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
              <TrendingUp className="h-3.5 w-3.5" />
              Pet progress
            </div>
            <h2 className="text-2xl font-black">Nutrition & weight trends</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Day-to-day meal quality and a weekly weight check-in for each pet.
            </p>
          </div>

          {petProfiles.length > 0 && (
            <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
              {petProfiles.map((pet, index) => (
                <button
                  key={`trend-${pet.petName}-${index}`}
                  type="button"
                  onClick={() => {
                    setTrendPetName(pet.petName)
                    setPetName(pet.petName)
                  }}
                  className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black transition-all duration-300 ${
                    trendPetName === pet.petName
                      ? "border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-500/20"
                      : "bg-background hover:-translate-y-0.5 hover:border-orange-300"
                  }`}
                >
                  {pet.petName}
                </button>
              ))}
            </div>
          )}
        </div>

        {trendPetName && !databaseUnavailable && needsWeightCheckIn && (
          <Card className="overflow-hidden rounded-[1.6rem] border-amber-300/60 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm dark:border-amber-900/60 dark:from-amber-950/20 dark:to-orange-950/10">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
                  <Scale className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-black">Weekly weight check for {trendPetName}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {lastWeight
                      ? `Last logged ${differenceInCalendarDays(new Date(), parseISO(lastWeight.loggedOn))} days ago · ${lastWeight.weightKg.toFixed(2)} kg`
                      : "No logger weight yet. Add the first weekly baseline."}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                className="rounded-xl bg-amber-500 font-black text-white hover:bg-amber-600"
                onClick={() => {
                  setWeightKg(
                    lastWeight?.weightKg
                      ? String(lastWeight.weightKg)
                      : trendPet?.weightKg
                        ? String(trendPet.weightKg)
                        : ""
                  )
                  setWeightOpen(true)
                }}
              >
                <Scale className="mr-2 h-4 w-4" />
                Log weight
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="rounded-[1.75rem] border-emerald-500/15 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Daily feed quality
              </CardTitle>
              <CardDescription>
                Average owner-rated meal quality for {trendPetName || "your pet"} during the visible logger month.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {qualityTrend.length ? (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={qualityTrend} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.16} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis
                        domain={[1, 3]}
                        ticks={[1, 2, 3]}
                        width={58}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value: number) =>
                          value === 3 ? "Healthy" : value === 2 ? "Okay" : "Poor"
                        }
                      />
                      <Tooltip
                        formatter={(value) => {
                          const score = Number(value)
                          return [
                            score >= 2.5 ? "Healthy" : score >= 1.5 ? "Okay" : "Poor",
                            "Daily quality",
                          ]
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed text-center">
                  <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
                  <p className="mt-3 font-black">No quality trend yet</p>
                  <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                    Log meals and mark them Healthy, Okay or Poor. The daily graph will build automatically.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-sky-500/15 shadow-sm">
            <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Scale className="h-5 w-5 text-sky-600" />
                  Weekly weight
                </CardTitle>
                <CardDescription>Last 90 days for {trendPetName || "your pet"}.</CardDescription>
              </div>
              {trendPetName && !databaseUnavailable && !needsWeightCheckIn && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    setWeightKg(
                    lastWeight?.weightKg
                      ? String(lastWeight.weightKg)
                      : trendPet?.weightKg
                        ? String(trendPet.weightKg)
                        : ""
                  )
                    setWeightOpen(true)
                  }}
                >
                  Update weight
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loadingWeights ? (
                <div className="flex h-[260px] items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
                </div>
              ) : weightTrend.length ? (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightTrend} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.16} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis
                        width={48}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value: number) => `${value}kg`}
                      />
                      <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} kg`, "Weight"]} />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed text-center">
                  <Scale className="h-8 w-8 text-muted-foreground/30" />
                  <p className="mt-3 font-black">Start the weight trend</p>
                  <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                    Log {trendPetName || "your pet"} once a week to see gradual changes instead of day-to-day noise.
                  </p>
                  {trendPetName && !databaseUnavailable && (
                    <Button
                      type="button"
                      size="sm"
                      className="mt-4 rounded-xl"
                      onClick={() => {
                        setWeightKg(trendPet?.weightKg ? String(trendPet.weightKg) : "")
                        setWeightOpen(true)
                      }}
                    >
                      Log first weight
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <Dialog open={weightOpen} onOpenChange={(open) => !savingWeight && setWeightOpen(open)}>
        <DialogContent className="rounded-[2rem] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-sky-600" />
              Weekly weight · {trendPetName}
            </DialogTitle>
            <DialogDescription>
              Log weight once a week to keep the trend useful and easy to compare.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 pt-2">
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
                value={weightKg}
                onChange={(event) => setWeightKg(event.target.value)}
                className="h-12 rounded-xl text-lg font-black"
                autoFocus
              />
            </div>
            <Button
              type="button"
              className="h-11 rounded-xl font-black"
              disabled={savingWeight || !weightKg}
              onClick={handleWeightSave}
            >
              {savingWeight && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save weekly weight
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                                setTrendPetName(pet.petName)
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

            <div className="logger-enter grid gap-2" style={{ animationDelay: "70ms" }}>
              <Label className="text-xs">How was this meal?</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["healthy", "okay", "poor"] as FeedQuality[]).map((quality) => {
                  const active = feedQuality === quality
                  return (
                    <button
                      key={quality}
                      type="button"
                      onClick={() => setFeedQuality(quality)}
                      className={`rounded-xl border px-3 py-2.5 text-xs font-black transition-all duration-250 ${
                        active
                          ? quality === "healthy"
                            ? "border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/15"
                            : quality === "poor"
                              ? "border-rose-500 bg-rose-500 text-white shadow-lg shadow-rose-500/15"
                              : "border-amber-500 bg-amber-500 text-white shadow-lg shadow-amber-500/15"
                          : "bg-background text-muted-foreground hover:-translate-y-0.5 hover:border-orange-300"
                      }`}
                    >
                      {qualityLabels[quality]}
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] leading-4 text-muted-foreground">
                This is the owner’s meal-quality rating used for the trend graph; PawSattva does not infer healthfulness from the food name.
              </p>
            </div>

            <div className="logger-enter grid grid-cols-2 gap-3" style={{ animationDelay: "100ms" }}>
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
