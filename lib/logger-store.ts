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

export interface PetLoggerEntry {
  id: string
  userId: string
  loggedOn: string
  petName: string
  mealType: LoggerMealType
  loggedAt?: string
  foodName: string
  quantity?: string
  waterMl?: number
  treats?: string
  notes?: string
  createdAt?: string
}

export type NewPetLoggerEntry = Omit<PetLoggerEntry, "id" | "createdAt">

type LoggerRow = {
  id: string
  userId: string
  loggedOn: string
  petName: string
  mealType: LoggerMealType
  loggedAt?: string | null
  foodName: string
  quantity?: string | null
  waterMl?: number | null
  treats?: string | null
  notes?: string | null
  createdAt?: string | null
}

type ListLoggerEntriesData = {
  petLoggerEntries: LoggerRow[]
}

type CreateLoggerEntryData = {
  petLoggerEntry_insert: LoggerRow
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
  quantity: row.quantity ?? undefined,
  waterMl: row.waterMl ?? undefined,
  treats: row.treats ?? undefined,
  notes: row.notes ?? undefined,
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
    quantity: entry.quantity?.trim() || null,
    waterMl: entry.waterMl ?? null,
    treats: entry.treats?.trim() || null,
    notes: entry.notes?.trim() || null,
  })

  return mapRow(data.petLoggerEntry_insert)
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
