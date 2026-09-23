"use client"

import { auth } from "@/firebase/firebase"
import {
  runSqlMutation,
  runSqlQuery,
} from "@/lib/firebase-sql-connect"

export type LoggerMealType =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "supplement"
  | "other"

export type FeedQuality = "healthy" | "okay" | "poor"

export interface PetLoggerEntry {
  id: string
  userId: string
  loggedOn: string
  petName: string
  mealType: LoggerMealType
  loggedAt?: string
  foodName: string
  feedQuality?: FeedQuality
  quantity?: string
  waterMl?: number
  treats?: string
  notes?: string
  createdAt?: string
}

export interface PetWeightEntry {
  id: string
  userId: string
  petName: string
  loggedOn: string
  weightKg: number
  createdAt?: string
}

export type NewPetLoggerEntry = Omit<PetLoggerEntry, "id" | "createdAt">
export type NewPetWeightEntry = Omit<PetWeightEntry, "id" | "createdAt">

type LoggerRow = {
  id: string
  userId: string
  loggedOn: string
  petName: string
  mealType: LoggerMealType
  loggedAt?: string | null
  foodName: string
  feedQuality?: FeedQuality | null
  quantity?: string | null
  waterMl?: number | null
  treats?: string | null
  notes?: string | null
  createdAt?: string | null
}

type WeightRow = {
  id: string
  userId: string
  petName: string
  loggedOn: string
  weightGrams: number
  createdAt?: string | null
}

type ListLoggerEntriesData = {
  petLoggerEntries: LoggerRow[]
}

type ListWeightEntriesData = {
  petWeightEntries: WeightRow[]
}

type CreateLoggerEntryData = {
  petLoggerEntry_insert: { id: string }
}

type CreateWeightEntryData = {
  petWeightEntry_insert: { id: string }
}

const assertCurrentUser = (userId: string) => {
  const currentUserId = auth.currentUser?.uid
  if (!currentUserId || currentUserId !== userId) {
    throw new Error("You must be signed in as the logger owner.")
  }
}

const mapRow = (row: LoggerRow): PetLoggerEntry => ({
  id: row.id,
  userId: row.userId,
  loggedOn: row.loggedOn,
  petName: row.petName,
  mealType: row.mealType,
  loggedAt: row.loggedAt ?? undefined,
  foodName: row.foodName,
  feedQuality: row.feedQuality ?? undefined,
  quantity: row.quantity ?? undefined,
  waterMl: row.waterMl ?? undefined,
  treats: row.treats ?? undefined,
  notes: row.notes ?? undefined,
  createdAt: row.createdAt ?? undefined,
})

const mapWeightRow = (row: WeightRow): PetWeightEntry => ({
  id: row.id,
  userId: row.userId,
  petName: row.petName,
  loggedOn: row.loggedOn,
  weightKg: row.weightGrams / 1000,
  createdAt: row.createdAt ?? undefined,
})

export async function getPetLoggerEntries(
  userId: string,
  startDate: string,
  endDate: string
): Promise<PetLoggerEntry[]> {
  assertCurrentUser(userId)

  const data = await runSqlQuery<
    ListLoggerEntriesData,
    { start: string; end: string }
  >("GetMyPetLoggerEntries", {
    start: startDate,
    end: endDate,
  })

  return data.petLoggerEntries.map(mapRow)
}

export async function getPetWeightEntries(
  userId: string,
  petName: string,
  startDate: string,
  endDate: string
): Promise<PetWeightEntry[]> {
  assertCurrentUser(userId)

  const data = await runSqlQuery<
    ListWeightEntriesData,
    { petName: string; start: string; end: string }
  >("GetMyPetWeightEntries", {
    petName: petName.trim(),
    start: startDate,
    end: endDate,
  })

  return data.petWeightEntries.map(mapWeightRow)
}

export async function savePetLoggerEntry(
  entry: NewPetLoggerEntry
): Promise<PetLoggerEntry> {
  assertCurrentUser(entry.userId)

  const data = await runSqlMutation<
    CreateLoggerEntryData,
    {
      loggedOn: string
      petName: string
      mealType: string
      loggedAt?: string | null
      foodName: string
      feedQuality: string
      quantity?: string | null
      waterMl?: number | null
      treats?: string | null
      notes?: string | null
    }
  >("AddPetLoggerEntry", {
    loggedOn: entry.loggedOn,
    petName: entry.petName.trim(),
    mealType: entry.mealType,
    loggedAt: entry.loggedAt || null,
    foodName: entry.foodName.trim(),
    feedQuality: entry.feedQuality || "okay",
    quantity: entry.quantity?.trim() || null,
    waterMl: entry.waterMl ?? null,
    treats: entry.treats?.trim() || null,
    notes: entry.notes?.trim() || null,
  })

  return {
    id: data.petLoggerEntry_insert.id,
    userId: entry.userId,
    loggedOn: entry.loggedOn,
    petName: entry.petName.trim(),
    mealType: entry.mealType,
    loggedAt: entry.loggedAt || undefined,
    foodName: entry.foodName.trim(),
    feedQuality: entry.feedQuality || "okay",
    quantity: entry.quantity?.trim() || undefined,
    waterMl: entry.waterMl,
    treats: entry.treats?.trim() || undefined,
    notes: entry.notes?.trim() || undefined,
    createdAt: new Date().toISOString(),
  }
}

export async function savePetWeightEntry(
  entry: NewPetWeightEntry
): Promise<PetWeightEntry> {
  assertCurrentUser(entry.userId)

  const weightGrams = Math.round(entry.weightKg * 1000)
  const data = await runSqlMutation<
    CreateWeightEntryData,
    { petName: string; loggedOn: string; weightGrams: number }
  >("AddPetWeightEntry", {
    petName: entry.petName.trim(),
    loggedOn: entry.loggedOn,
    weightGrams,
  })

  return {
    id: data.petWeightEntry_insert.id,
    userId: entry.userId,
    petName: entry.petName.trim(),
    loggedOn: entry.loggedOn,
    weightKg: entry.weightKg,
    createdAt: new Date().toISOString(),
  }
}

export async function deletePetLoggerEntry(
  entryId: string,
  userId: string
): Promise<void> {
  assertCurrentUser(userId)

  await runSqlMutation<
    { petLoggerEntry_delete?: { id: string } | null },
    { id: string }
  >("DeleteMyPetLoggerEntry", { id: entryId })
}
