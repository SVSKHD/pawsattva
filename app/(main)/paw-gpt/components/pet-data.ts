import { differenceInCalendarDays, format, parseISO } from "date-fns"

import type { PetFeed, PetFeedEntry } from "@/firebase/firestore"
import type { PetLoggerEntry, PetWeightEntry } from "@/lib/logger-store"
import { PAW_GPT_LIMITS, type PawGptPetContext } from "@/lib/paw-gpt"

export interface GptPet {
  name: string
  /** Latest assessment saved on the user profile */
  profile?: PetFeedEntry
  /** Latest full wellness report (adds allergies, medical conditions, dislikes) */
  report?: PetFeed
}

export const isCatPet = (pet?: GptPet | null) =>
  Boolean((pet?.profile?.petType ?? pet?.report?.petType)?.toLowerCase().includes("cat"))

const assessedTime = (pet: { assessedAt?: string; createdAt?: unknown }) =>
  String(pet.assessedAt ?? pet.createdAt ?? "")

/** One entry per pet name (latest assessment wins), plus pets that only appear in food logs. */
export function mergePets(profilePets: PetFeedEntry[], reports: PetFeed[], loggedNames: string[]): GptPet[] {
  const byName = new Map<string, GptPet>()

  for (const entry of profilePets) {
    const name = entry.petName?.trim()
    if (!name) continue
    const current = byName.get(name)
    if (!current?.profile || assessedTime(entry) > assessedTime(current.profile)) {
      byName.set(name, { ...current, name, profile: entry })
    }
  }

  // Reports arrive newest first
  for (const report of reports) {
    const name = report.petName?.trim()
    if (!name) continue
    const current = byName.get(name)
    if (!current?.report) byName.set(name, { ...current, name, report })
  }

  for (const name of loggedNames) {
    if (!byName.has(name)) byName.set(name, { name })
  }

  return Array.from(byName.values())
}

export function describeAge(pet: GptPet) {
  const source = pet.profile ?? pet.report
  if (!source?.ageValue) return undefined
  const unit = source.ageUnit === "months" ? "month" : "year"
  return `${source.ageValue} ${unit}${source.ageValue === 1 ? "" : "s"}`
}

export function petSubtitle(pet: GptPet) {
  const source = pet.profile ?? pet.report
  return [source?.petBreed, describeAge(pet), source?.weightKg ? `${source.weightKg} kg` : undefined]
    .filter(Boolean)
    .join(" · ")
}

export function weightStatusOf(pet: GptPet) {
  return pet.profile?.weightStatus ?? pet.report?.weightStatus
}

const compact = (record: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined && value !== null && value !== "")
  ) as Record<string, string | number | boolean>

/** The record Paw GPT answers from, built only from the owner's own data. */
export function buildPetContext(
  pet: GptPet,
  allEntries: PetLoggerEntry[],
  weights: PetWeightEntry[],
  ownerName?: string
): PawGptPetContext {
  const source = { ...pet.report, ...pet.profile }
  const today = new Date()

  const petRecord = compact({
    name: pet.name,
    species: source.petType,
    breed: source.petBreed,
    age: describeAge(pet),
    lifeStage: source.lifeStage,
    sex: source.sex,
    neutered: source.neutered,
    weightKgAtAssessment: source.weightKg,
    heightCm: source.heightCm,
    breedWeightRange: source.breedReferenceRange,
    breedHeightRange: source.breedHeightReferenceRange,
    activityLevel: source.activityLevel,
    bodyConditionScoreOutOf9: source.bodyConditionScore,
    weightStatus: source.weightStatus,
    foodType: source.foodType,
    foodBrand: source.foodBrand,
    mealsPerDay: source.dailyMeals,
    dailyQuantity: source.dailyQuantity,
    treatsPerDay: source.treatsPerDay,
    dietaryConcerns: source.dietaryConcerns,
    allergies: pet.report?.allergies,
    medicalConditions: pet.report?.medicalConditions,
    foodDislikes: pet.report?.foodDislikes,
    assessedOn: source.assessedAt?.slice(0, 10),
    hasAssessment: Boolean(pet.profile || pet.report),
  })

  const entries = allEntries
    .filter((entry) => entry.petName === pet.name)
    .sort((a, b) => `${b.loggedOn}${b.loggedAt ?? ""}`.localeCompare(`${a.loggedOn}${a.loggedAt ?? ""}`))

  const mealLogs = entries.slice(0, 250).map((entry) =>
    compact({
      date: entry.loggedOn,
      time: entry.loggedAt,
      meal: entry.mealType,
      food: entry.foodName,
      quality: entry.feedQuality,
      quantity: entry.quantity,
      waterMl: entry.waterMl,
      treats: entry.treats,
      notes: entry.notes,
    })
  ) as unknown as PawGptPetContext["mealLogs"]

  const quality = { healthy: 0, okay: 0, poor: 0 }
  const waterByDay = new Map<string, number>()
  for (const entry of entries) {
    if (entry.feedQuality) quality[entry.feedQuality] += 1
    if (entry.waterMl !== undefined) waterByDay.set(entry.loggedOn, (waterByDay.get(entry.loggedOn) ?? 0) + entry.waterMl)
  }
  const waterDays = Array.from(waterByDay.values())
  const sortedWeights = [...weights].sort((a, b) => a.loggedOn.localeCompare(b.loggedOn))
  const firstWeight = sortedWeights[0]
  const lastWeight = sortedWeights.at(-1)

  const summary = compact({
    foodLogWindowDays: PAW_GPT_LIMITS.mealLogDays,
    mealsLogged: entries.length,
    daysWithLogs: new Set(entries.map((entry) => entry.loggedOn)).size,
    lastMealLoggedOn: entries[0]?.loggedOn,
    healthyMeals: quality.healthy,
    okayMeals: quality.okay,
    poorMeals: quality.poor,
    averageWaterMlOnDaysLogged: waterDays.length
      ? Math.round(waterDays.reduce((sum, value) => sum + value, 0) / waterDays.length)
      : undefined,
    weightHistoryWindowDays: PAW_GPT_LIMITS.weightDays,
    weighIns: sortedWeights.length,
    latestWeightKg: lastWeight?.weightKg,
    latestWeighInOn: lastWeight?.loggedOn,
    daysSinceLastWeighIn: lastWeight ? differenceInCalendarDays(today, parseISO(lastWeight.loggedOn)) : undefined,
    weightChangeKgInWindow:
      firstWeight && lastWeight && firstWeight !== lastWeight
        ? Number((lastWeight.weightKg - firstWeight.weightKg).toFixed(2))
        : undefined,
  })

  return {
    today: format(today, "yyyy-MM-dd (EEEE)"),
    ownerName: ownerName?.split(" ")[0] || undefined,
    pet: petRecord,
    mealLogs,
    weights: sortedWeights.map((entry) => ({ date: entry.loggedOn, kg: entry.weightKg })),
    summary,
  }
}

export function reportPrompts(petName: string) {
  return [
    {
      title: "Full health report",
      description: "Profile, diet, weight and next steps",
      prompt: `Create a full health and wellness report for ${petName} using everything in their record.`,
    },
    {
      title: "Last 7 days diet",
      description: "Meals, quality, water and treats",
      prompt: `Give me a diet report for ${petName} for the last 7 days: meals, food quality, water and treats, and what to improve.`,
    },
    {
      title: "Weight trend",
      description: "Weigh-ins vs. breed range",
      prompt: `Report on ${petName}'s weight trend and how it compares with their breed range and body condition.`,
    },
    {
      title: "Today's feeding plan",
      description: "Portions and timing for today",
      prompt: `Suggest a feeding plan for ${petName} for today, with portions and timings that fit their profile.`,
    },
  ]
}
