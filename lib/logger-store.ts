"use client"

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore"

import { auth } from "@/firebase/firebase"
import { db } from "@/firebase/db"

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

const assertCurrentUser = (userId: string) => {
  const currentUserId = auth.currentUser?.uid
  if (!currentUserId || currentUserId !== userId) {
    throw new Error("You must be signed in as the logger owner.")
  }
}

const loggerCollection = (userId: string) =>
  collection(db, "users", userId, "petLoggerEntries")

const weightCollection = (userId: string) =>
  collection(db, "users", userId, "petWeightEntries")

const toIsoString = (value: unknown) => {
  if (!value) return undefined
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString()
  }
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "string") return value
  return undefined
}

const stripUndefined = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined)
  )

export async function getPetLoggerEntries(
  userId: string,
  startDate: string,
  endDate: string
): Promise<PetLoggerEntry[]> {
  assertCurrentUser(userId)

  const snapshot = await getDocs(
    query(
      loggerCollection(userId),
      where("loggedOn", ">=", startDate),
      where("loggedOn", "<=", endDate),
      orderBy("loggedOn", "desc")
    )
  )

  return snapshot.docs.map((entry) => {
    const data = entry.data()
    return {
      id: entry.id,
      userId,
      loggedOn: String(data.loggedOn ?? ""),
      petName: String(data.petName ?? ""),
      mealType: (data.mealType ?? "other") as LoggerMealType,
      loggedAt: data.loggedAt || undefined,
      foodName: String(data.foodName ?? ""),
      feedQuality: data.feedQuality as FeedQuality | undefined,
      quantity: data.quantity || undefined,
      waterMl: typeof data.waterMl === "number" ? data.waterMl : undefined,
      treats: data.treats || undefined,
      notes: data.notes || undefined,
      createdAt: toIsoString(data.createdAt),
    }
  })
}

export async function getPetWeightEntries(
  userId: string,
  petName: string,
  startDate: string,
  endDate: string
): Promise<PetWeightEntry[]> {
  assertCurrentUser(userId)

  const snapshot = await getDocs(
    query(
      weightCollection(userId),
      where("petName", "==", petName.trim()),
      where("loggedOn", ">=", startDate),
      where("loggedOn", "<=", endDate),
      orderBy("loggedOn", "asc")
    )
  )

  return snapshot.docs.map((entry) => {
    const data = entry.data()
    return {
      id: entry.id,
      userId,
      petName: String(data.petName ?? ""),
      loggedOn: String(data.loggedOn ?? ""),
      weightKg: Number(data.weightKg ?? 0),
      createdAt: toIsoString(data.createdAt),
    }
  })
}

export async function savePetLoggerEntry(
  entry: NewPetLoggerEntry
): Promise<PetLoggerEntry> {
  assertCurrentUser(entry.userId)

  const payload = stripUndefined({
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
    createdAt: serverTimestamp(),
  })

  const saved = await addDoc(loggerCollection(entry.userId), payload)

  return {
    id: saved.id,
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

  const safePetKey =
    entry.petName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "pet"
  const weightId = `${safePetKey}-${entry.loggedOn}`

  await setDoc(
    doc(db, "users", entry.userId, "petWeightEntries", weightId),
    {
      petName: entry.petName.trim(),
      loggedOn: entry.loggedOn,
      weightKg: entry.weightKg,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  )

  return {
    id: weightId,
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
  await deleteDoc(doc(db, "users", userId, "petLoggerEntries", entryId))
}
