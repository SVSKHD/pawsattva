"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  getDaysInMonth,
  isSameMonth,
  parseISO,
  startOfMonth,
  subDays,
} from "date-fns"
import { CalendarDays, Cat, Dog, Loader2, PawPrint, Plus, Scale, Users } from "lucide-react"
import { toast } from "sonner"

import { getUserProfile } from "@/firebase/firestore"
import { trackEvent } from "@/firebase/analytics"
import { useAuth } from "@/components/auth-provider"
import AdminLoader from "@/components/loader"
import Paw from "../../pawsattva.png"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  deletePetLoggerEntry,
  getPetLoggerEntries,
  getPetWeightEntries,
  savePetLoggerEntry,
  savePetWeightEntry,
  type LoggerMealType,
  type PetLoggerEntry,
  type PetWeightEntry,
} from "@/lib/logger-store"

import { DayPanel } from "./components/day-panel"
import { MealDialog, type MealDraft } from "./components/meal-dialog"
import { TrendsCard } from "./components/trends-card"
import { isCat, mealLabels, qualityLabels, qualityScores, toDateKey, type LoggerPet } from "./components/shared"

const ALL = "__all__"

export function LoggerClient() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [profilePets, setProfilePets] = useState<LoggerPet[]>([])
  const [loadingPets, setLoadingPets] = useState(true)
  const [activePet, setActivePet] = useState<string>(ALL)
  const [trendPetName, setTrendPetName] = useState("")

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [visibleMonth, setVisibleMonth] = useState(new Date())
  const [entries, setEntries] = useState<PetLoggerEntry[]>([])
  const [loadingEntries, setLoadingEntries] = useState(true)

  const [weightEntries, setWeightEntries] = useState<PetWeightEntry[]>([])
  const [loadingWeights, setLoadingWeights] = useState(false)
  const [weightOpen, setWeightOpen] = useState(false)

  const [mealOpen, setMealOpen] = useState(false)
  const [mealTemplate, setMealTemplate] = useState<PetLoggerEntry | null>(null)
  const [mealInitial, setMealInitial] = useState<LoggerMealType | undefined>()

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?returnTo=/logger")
  }, [authLoading, router, user])

  // Saved pets from Pet Feed
  useEffect(() => {
    if (!user) return
    let active = true
    getUserProfile(user.uid)
      .then((profile) => {
        if (!active) return
        const pets: LoggerPet[] = (profile?.petFeeds ?? [])
          .filter((pet) => pet.petName?.trim())
          .map((pet) => ({
            name: pet.petName.trim(),
            type: pet.petType,
            breed: pet.petBreed,
            foodBrand: pet.foodBrand,
            foodType: pet.foodType,
            dailyQuantity: pet.dailyQuantity,
            weightKg: pet.weightKg,
          }))
        setProfilePets(pets)
        if (pets.length === 1) setActivePet(pets[0].name)
        setTrendPetName((current) => current || pets[0]?.name || "")
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
      const monthEntries = await getPetLoggerEntries(
        user.uid,
        toDateKey(startOfMonth(visibleMonth)),
        toDateKey(endOfMonth(visibleMonth))
      )
      setEntries(monthEntries)
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

  // Pets from profiles first, then any other names that only appear in logs
  const pets = useMemo(() => {
    const known = new Set(profilePets.map((pet) => pet.name))
    const fromLogs = Array.from(new Set(entries.map((entry) => entry.petName.trim()).filter(Boolean)))
      .filter((name) => !known.has(name))
      .sort()
      .map((name): LoggerPet => ({ name }))
    return [...profilePets, ...fromLogs]
  }, [entries, profilePets])

  // The trend needs one pet: follow the switcher, otherwise keep the trend's own choice
  const trendPet = activePet !== ALL ? activePet : trendPetName || pets[0]?.name || ""

  const loadWeights = useCallback(async () => {
    if (!user || !trendPet) {
      setWeightEntries([])
      return
    }
    setLoadingWeights(true)
    try {
      const end = new Date()
      setWeightEntries(await getPetWeightEntries(user.uid, trendPet, toDateKey(subDays(end, 90)), toDateKey(end)))
    } catch (error) {
      console.error("Unable to load pet weight history:", error)
      toast.error("Could not load weight history.")
    } finally {
      setLoadingWeights(false)
    }
  }, [trendPet, user])

  useEffect(() => {
    void loadWeights()
  }, [loadWeights])

  const petEntries = useMemo(
    () => (activePet === ALL ? entries : entries.filter((entry) => entry.petName === activePet)),
    [activePet, entries]
  )

  const selectedKey = toDateKey(selectedDate)
  const dayEntries = useMemo(
    () =>
      petEntries
        .filter((entry) => entry.loggedOn === selectedKey)
        .sort((a, b) => (a.loggedAt ?? "").localeCompare(b.loggedAt ?? "")),
    [petEntries, selectedKey]
  )

  const loggedDays = useMemo(() => Array.from(new Set(petEntries.map((entry) => entry.loggedOn))), [petEntries])
  const loggedDates = useMemo(() => loggedDays.map((day) => parseISO(day)), [loggedDays])

  const qualityTrend = useMemo(() => {
    const byDay = new Map<string, { total: number; count: number }>()
    entries
      .filter((entry) => entry.petName === trendPet && entry.feedQuality)
      .forEach((entry) => {
        const current = byDay.get(entry.loggedOn) || { total: 0, count: 0 }
        current.total += qualityScores[entry.feedQuality!]
        current.count += 1
        byDay.set(entry.loggedOn, current)
      })
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, value]) => ({ date: format(parseISO(day), "dd MMM"), score: Number((value.total / value.count).toFixed(2)) }))
  }, [entries, trendPet])

  const lastWeight = weightEntries.at(-1)
  const daysSinceWeight = lastWeight ? differenceInCalendarDays(new Date(), parseISO(lastWeight.loggedOn)) : null
  const weightDue = Boolean(trendPet) && !loadingWeights && (daysSinceWeight === null || daysSinceWeight >= 7)
  const trendProfile = profilePets.find((pet) => pet.name === trendPet)
  const suggestedWeight = lastWeight ? String(lastWeight.weightKg) : trendProfile?.weightKg ? String(trendProfile.weightKg) : ""

  const openMeal = (meal?: LoggerMealType, template?: PetLoggerEntry) => {
    setMealTemplate(template ?? null)
    setMealInitial(meal)
    setMealOpen(true)
  }

  const handleSaveMeal = async (draft: MealDraft) => {
    if (!user) return
    try {
      const saved = await savePetLoggerEntry({ ...draft, userId: user.uid, loggedOn: selectedKey })
      setEntries((current) => [saved, ...current])
      toast.success(`${mealLabels[saved.mealType]} logged for ${saved.petName}.`)
      void trackEvent("meal_logged", {
        meal_type: saved.mealType,
        quality: saved.feedQuality,
        with_details: Boolean(saved.quantity || saved.waterMl !== undefined || saved.treats || saved.notes),
      })
    } catch (error) {
      console.error("Unable to save pet logger entry:", error)
      toast.error("Could not save this food log.")
      throw error
    }
  }

  const handleDelete = async (entry: PetLoggerEntry) => {
    if (!user) return
    try {
      await deletePetLoggerEntry(entry.id, user.uid)
      setEntries((current) => current.filter((item) => item.id !== entry.id))
      toast.success("Log entry removed.")
    } catch (error) {
      console.error("Unable to delete logger entry:", error)
      toast.error("Could not remove this log entry.")
    }
  }

  const handleSaveWeight = async (kg: number) => {
    if (!user || !trendPet) return
    try {
      const saved = await savePetWeightEntry({ userId: user.uid, petName: trendPet, loggedOn: toDateKey(new Date()), weightKg: kg })
      setWeightEntries((current) =>
        [...current.filter((entry) => entry.loggedOn !== saved.loggedOn), saved].sort((a, b) => a.loggedOn.localeCompare(b.loggedOn))
      )
      toast.success(`${trendPet}'s weight was logged.`)
      void trackEvent("weight_logged")
    } catch (error) {
      console.error("Unable to save pet weight:", error)
      toast.error("Could not save this weight.")
      throw error
    }
  }

  const shareDay = async () => {
    if (!dayEntries.length) return
    const lines = dayEntries.map((entry) => {
      const parts = [
        `${mealLabels[entry.mealType]}${entry.loggedAt ? ` at ${entry.loggedAt}` : ""} — ${entry.foodName}${entry.quantity ? ` (${entry.quantity})` : ""}`,
        entry.waterMl !== undefined ? `Water: ${entry.waterMl} ml` : "",
        entry.treats ? `Treats: ${entry.treats}` : "",
        entry.feedQuality ? `Quality: ${qualityLabels[entry.feedQuality]}` : "",
      ].filter(Boolean)
      return `• ${entry.petName}: ${parts.join(" | ")}`
    })
    const title = `PawSattva Pet Food Log — ${format(selectedDate, "dd MMM yyyy")}`
    const text = [title, "", ...lines, "", "Shared from pawsattva.com/logger"].join("\n")

    try {
      if (navigator.share) await navigator.share({ title, text })
      else {
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

  if (authLoading || !user) {
    return <AdminLoader img={Paw} title="Opening your food logger" />
  }

  const monthDaysLogged = loggedDays.filter((day) => isSameMonth(parseISO(day), visibleMonth)).length
  const monthDays = isSameMonth(visibleMonth, new Date()) ? new Date().getDate() : getDaysInMonth(visibleMonth)

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-28 sm:px-6 md:pt-32 lg:px-8">
      {/* Header: title, pet switcher, primary action */}
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
            <CalendarDays className="h-3.5 w-3.5" /> Private pet diary
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Food Logger</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What each pet eats, day by day — shareable with family or your vet.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {pets.length > 1 && (
            <div role="tablist" aria-label="Pet" className="flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl bg-muted/70 p-1">
              <PetTab active={activePet === ALL} onClick={() => setActivePet(ALL)} icon={Users} label="All pets" />
              {pets.map((pet) => (
                <PetTab
                  key={pet.name}
                  active={activePet === pet.name}
                  onClick={() => setActivePet(pet.name)}
                  icon={isCat(pet) ? Cat : pet.type ? Dog : PawPrint}
                  label={pet.name}
                />
              ))}
            </div>
          )}
          <Button
            type="button"
            className="h-10 rounded-2xl bg-orange-500 px-5 font-bold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600"
            onClick={() => openMeal()}
          >
            <Plus className="h-4 w-4" /> Log meal
          </Button>
        </div>
      </header>

      {!loadingPets && profilePets.length === 0 && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-orange-300/60 bg-orange-50/50 px-4 py-3 text-sm dark:border-orange-900 dark:bg-orange-950/10">
          <span>
            <strong>Add your pet in Pet Feed</strong>
            <span className="text-muted-foreground"> to pick them in one tap and get their usual food & portions prefilled.</span>
          </span>
          <Button asChild size="sm" variant="outline" className="rounded-lg">
            <Link href="/pet-feed">Open Pet Feed</Link>
          </Button>
        </div>
      )}

      {weightDue && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-sky-300/50 bg-sky-50/70 px-4 py-3 dark:border-sky-900/60 dark:bg-sky-950/20">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white">
            <Scale className="h-4 w-4" />
          </span>
          <p className="min-w-0 flex-1 text-sm">
            <strong>Weekly weigh-in for {trendPet}</strong>
            <span className="text-muted-foreground">
              {lastWeight ? ` · last ${lastWeight.weightKg.toFixed(2)} kg, ${daysSinceWeight} days ago` : " · no weight logged yet"}
            </span>
          </p>
          <Button type="button" size="sm" className="rounded-lg bg-sky-600 text-white hover:bg-sky-700" onClick={() => setWeightOpen(true)}>
            Log weight
          </Button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Calendar */}
        <aside className="h-fit rounded-3xl border bg-card p-4 shadow-sm lg:sticky lg:top-28">
          <Calendar
            mode="single"
            selected={selectedDate}
            month={visibleMonth}
            onMonthChange={setVisibleMonth}
            onSelect={(date) => {
              if (!date) return
              setSelectedDate(date)
              if (!isSameMonth(date, visibleMonth)) setVisibleMonth(date)
            }}
            modifiers={{ logged: loggedDates }}
            modifiersClassNames={{
              logged:
                "relative font-bold after:pointer-events-none after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-orange-500",
            }}
            className="mx-auto w-full"
          />
          <div className="mt-3 border-t pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">{format(visibleMonth, "MMMM")} logged</span>
              <span className="font-bold tabular-nums">
                {loadingEntries ? <Loader2 className="h-3 w-3 animate-spin" /> : `${monthDaysLogged} / ${monthDays} days`}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-orange-500 transition-all"
                style={{ width: `${monthDays ? Math.min(100, (monthDaysLogged / monthDays) * 100) : 0}%` }}
              />
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <DayPanel
            date={selectedDate}
            onDateChange={(date) => {
              setSelectedDate(date)
              if (!isSameMonth(date, visibleMonth)) setVisibleMonth(date)
            }}
            entries={dayEntries}
            loading={loadingEntries}
            showPet={activePet === ALL && pets.length > 1}
            onAdd={(meal) => openMeal(meal)}
            onLogAgain={(entry) => openMeal(undefined, entry)}
            onDelete={handleDelete}
            onShare={shareDay}
          />

          <TrendsCard
            petName={trendPet}
            petChoices={activePet === ALL ? pets.map((pet) => pet.name) : []}
            onPetChange={setTrendPetName}
            monthLabel={format(visibleMonth, "MMMM yyyy")}
            qualityTrend={qualityTrend}
            weightEntries={weightEntries}
            loadingWeights={loadingWeights}
            weightDialogOpen={weightOpen}
            onWeightDialogChange={setWeightOpen}
            suggestedWeight={suggestedWeight}
            onSaveWeight={handleSaveWeight}
          />
        </div>
      </div>

      <MealDialog
        open={mealOpen}
        onOpenChange={setMealOpen}
        date={selectedDate}
        pets={pets}
        defaultPetName={activePet !== ALL ? activePet : pets[0]?.name || ""}
        template={mealTemplate}
        initialMeal={mealInitial}
        onSave={handleSaveMeal}
      />
    </div>
  )
}

function PetTab({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Dog; label: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition ${
        active ? "bg-background text-orange-700 shadow-sm dark:text-orange-300" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}
