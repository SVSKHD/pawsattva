import { differenceInCalendarDays, format, parseISO } from "date-fns"

import type { PetFeed, PetFeedEntry } from "@/firebase/firestore"
import type { PetLoggerEntry, PetWeightEntry } from "@/lib/logger-store"
import { PAW_GPT_LIMITS, type PawGptPetContext } from "@/lib/paw-gpt"
import type { LoggerPet } from "@/app/(main)/logger/components/shared"

export interface GptPet {
  name: string
  /** Latest assessment saved on the user profile */
  profile?: PetFeedEntry
  /** Latest full wellness report (adds allergies, medical conditions, dislikes) */
  report?: PetFeed
  /** Not a real pet: the "planning a pet" chat for owners who don't have one yet */
  planning?: boolean
  /** Not signed in: general questions with no pet record (also `planning`, so nothing is loaded) */
  guest?: boolean
}

/** Chats about getting a new pet are filed under this name (chat history, prompt dock, picker). */
export const PLANNING_PET_NAME = "Pet planning"
export const planningPet: GptPet = { name: PLANNING_PET_NAME, planning: true }

/** Visitors who aren't signed in ask about pets in general. */
export const GUEST_PET_NAME = "Guest"
export const guestPet: GptPet = { name: GUEST_PET_NAME, planning: true, guest: true }

export const GUEST_PROMPTS = [
  "How much should a puppy eat each day?",
  "How do I know if my cat is at a healthy weight?",
  "Which dog breeds suit a small apartment in India?",
  "What vaccinations does a new kitten need?",
]
export const isPlanningPet = (pet?: GptPet | null) => Boolean(pet?.planning)

/** "dog" or "cat" when the question itself names one ("how about my dog's weight"), else null. */
export function speciesInQuestion(question: string | undefined): "dog" | "cat" | null {
  const text = question?.toLowerCase() ?? ""
  const cat = /\b(cat|cats|kitten|kittens|kitty|feline|meow)\b/.test(text)
  const dog = /\b(dog|dogs|puppy|puppies|pup|pups|canine|doggo|woof)\b/.test(text)
  return cat === dog ? null : cat ? "cat" : "dog"
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
  if (pet.guest) return "Ask anything about dogs and cats"
  if (pet.planning) return "Choosing and preparing for a new pet"
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
  const today = new Date()
  if (pet.guest) {
    return {
      today: format(today, "yyyy-MM-dd (EEEE)"),
      pet: { mode: "guest", note: "The visitor isn't signed in, so there is no pet record." },
      mealLogs: [],
      weights: [],
      summary: {},
    }
  }
  if (pet.planning) {
    // No pet yet: the prompt switches Paw GPT to helping the owner choose and prepare.
    return {
      today: format(today, "yyyy-MM-dd (EEEE)"),
      ownerName: ownerName?.split(" ")[0] || undefined,
      pet: { mode: "planning", note: "The owner has no pet on PawSattva yet and is planning to get one." },
      mealLogs: [],
      weights: [],
      summary: {},
    }
  }
  const source = { ...pet.report, ...pet.profile }

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

/** The shape the Food Logger's meal dialog expects. */
export function toLoggerPet(pet: GptPet): LoggerPet {
  const source = pet.profile ?? pet.report
  return {
    name: pet.name,
    type: source?.petType,
    breed: source?.petBreed,
    foodBrand: source?.foodBrand,
    foodType: source?.foodType,
    dailyQuantity: source?.dailyQuantity,
    weightKg: source?.weightKg,
  }
}

const FOOD_WORDS =
  /\b(food|foods|feed|feeding|fed|meal|meals|diet|portion|portions|kibble|treat|treats|water|drink|drinking|calorie|calories|breakfast|lunch|dinner|snack|appetite|eat|eats|eating|ate|grams?|food log|logger)\b/i

/** True when a question or answer is about what the pet eats or drinks: worth a "Log food" shortcut. */
export const isFoodRelated = (...texts: (string | undefined)[]) =>
  texts.some((text) => Boolean(text && (FOOD_WORDS.test(text) || text.includes("/logger"))))

export interface PromptGroup {
  id: string
  label: string
  prompts: { label: string; prompt: string }[]
}

/** Questions for owners who don't have a pet yet. */
const PLANNING_PROMPTS: PromptGroup[] = [
  {
    id: "choose",
    label: "Choosing",
    prompts: [
      { label: "Dog or cat?", prompt: "I'm thinking about getting a pet. Help me decide between a dog and a cat based on my home, schedule and budget. Ask me what you need to know." },
      { label: "Breeds for my home", prompt: "Which dog and cat breeds suit apartment living in an Indian city, with someone away at work for part of the day?" },
      { label: "Adopt or buy?", prompt: "Should I adopt (including Indian breeds/indies) or buy from a breeder? How do I spot a responsible breeder or shelter?" },
      { label: "Monthly cost", prompt: "What does a dog or cat cost per month in India: food, vet care, vaccinations, grooming and supplies? Give a realistic range in ₹." },
    ],
  },
  {
    id: "prepare",
    label: "Preparing",
    prompts: [
      { label: "First-week checklist", prompt: "Give me a checklist of everything to buy and set up before bringing a new puppy or kitten home." },
      { label: "Pet-proof my home", prompt: "How do I pet-proof my home for a new puppy or kitten? Cover cables, plants, balconies and unsafe foods." },
      { label: "First vet visit", prompt: "What happens at the first vet visit, and which vaccinations and deworming does a new puppy or kitten need in India?" },
      { label: "First food", prompt: "What should a new puppy or kitten eat, how often, and how do I switch from what the shelter or breeder fed?" },
    ],
  },
]

/** Ready-made questions for the prompt dock, written for the selected pet. */
export function promptLibrary(pet: GptPet): PromptGroup[] {
  if (pet.planning) return PLANNING_PROMPTS
  const name = pet.name
  const cat = isCatPet(pet)
  const kind = cat ? "cat" : "dog"
  return [
    {
      id: "reports",
      label: "Reports",
      prompts: reportPrompts(name).map(({ title, prompt }) => ({ label: title, prompt })),
    },
    {
      id: "food",
      label: "Food",
      prompts: [
        { label: "Daily portion", prompt: `How much should ${name} eat per day, split into meals? Show grams based on their weight, age and activity.` },
        { label: "Healthy treats", prompt: `Which healthy treats suit ${name}, how many per day, and which common foods are unsafe for a ${kind}?` },
        { label: "Switch food safely", prompt: `How do I switch ${name} to a new food without upsetting their stomach? Give a day-by-day plan.` },
        { label: "Water intake", prompt: `How much water should ${name} drink each day, and how can I tell if they're drinking too little or too much?` },
      ],
    },
    {
      id: "health",
      label: "Health",
      prompts: [
        { label: "Weight goal", prompt: `Is ${name} at a healthy weight? If not, what target weight and weekly pace should we aim for?` },
        { label: "Warning signs", prompt: `Which symptoms in ${name} should make me call a vet straight away, and which can wait a day?` },
        { label: "Upset stomach", prompt: `${name} has an upset stomach. What can I do at home today, and when should I see a vet?` },
        { label: "Vaccines & deworming", prompt: `What vaccination and deworming schedule is usual for a ${kind} like ${name} in India?` },
      ],
    },
    {
      id: "care",
      label: cat ? "Care & play" : "Exercise & care",
      prompts: cat
        ? [
            { label: "Play routine", prompt: `Suggest a daily play and enrichment routine for ${name} that fits their age.` },
            { label: "Litter habits", prompt: `What's normal for ${name}'s litter box habits, and what changes should worry me?` },
            { label: "Grooming", prompt: `How often should I brush ${name}, trim nails and clean ears, and how do I make it stress-free?` },
            { label: "Hot weather", prompt: `How do I keep ${name} cool and hydrated during an Indian summer?` },
          ]
        : [
            { label: "Daily exercise", prompt: `How much exercise does ${name} need each day, and what kinds suit their breed and age?` },
            { label: "Grooming", prompt: `How often should I bathe and brush ${name}, trim nails and clean ears?` },
            { label: "Hot weather walks", prompt: `How do I keep ${name} safe on walks during an Indian summer? Best times, signs of heatstroke and paw care.` },
            { label: "Calmer at home", prompt: `${name} gets restless or anxious at home. What routine and training tips can help?` },
          ],
    },
  ]
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
