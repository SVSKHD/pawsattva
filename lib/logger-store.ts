"use client"

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore"

import { db } from "@/firebase/db"
import { isSupabaseConfigured, supabaseRest } from "@/lib/supabase/http"

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

type SupabaseLoggerRow = {
  id: string
  user_id: string
  logged_on: string
  pet_name: string
  meal_type: LoggerMealType
  logged_at: string | null
  food_name: string
  quantity: string | null
  water_ml: number | null
  treats: string | null
  notes: string | null
  created_at: string
}

const mapSupabaseRow = (row: SupabaseLoggerRow): PetLoggerEntry => ({
  id: row.id,
  userId: row.user_id,
  loggedOn: row.logged_on,
  petName: row.pet_name,
  mealType: row.meal_type,
  loggedAt: row.logged_at?.slice(0, 5) || undefined,
  foodName: row.food_name,
  quantity: row.quantity ?? undefined,
  waterMl: row.water_ml ?? undefined,
  treats: row.treats ?? undefined,
  notes: row.notes ?? undefined,
  createdAt: row.created_at,
})

const sortEntries = (entries: PetLoggerEntry[]) =>
  [...entries].sort((a, b) => {
    const dateCompare = b.loggedOn.localeCompare(a.loggedOn)
    if (dateCompare !== 0) return dateCompare
    return (b.loggedAt ?? "").localeCompare(a.loggedAt ?? "")
  })

export async function getPetLoggerEntries(
  userId: string,
  startDate: string,
  endDate: string
): Promise<PetLoggerEntry[]> {
  if (isSupabaseConfigured()) {
    const rows = await supabaseRest<SupabaseLoggerRow[]>(
      `pet_logger_entries?user_id=eq.${encodeURIComponent(userId)}&logged_on=gte.${startDate}&logged_on=lte.${endDate}&select=*&order=logged_on.desc,logged_at.desc.nullslast`
    )
    return rows.map(mapSupabaseRow)
  }

  const snapshot = await getDocs(
    query(collection(db, "petLoggerEntries"), where("userId", "==", userId))
  )

  const entries = snapshot.docs
    .map((entry) => {
      const data = entry.data() as Omit<PetLoggerEntry, "id">
      return {
        id: entry.id,
        ...data,
        createdAt:
          typeof data.createdAt === "object" &&
          data.createdAt &&
          "toDate" in data.createdAt
            ? (data.createdAt as { toDate: () => Date }).toDate().toISOString()
            : data.createdAt,
      } as PetLoggerEntry
    })
    .filter((entry) => entry.loggedOn >= startDate && entry.loggedOn <= endDate)

  return sortEntries(entries)
}

export async function savePetLoggerEntry(
  entry: NewPetLoggerEntry
): Promise<PetLoggerEntry> {
  if (isSupabaseConfigured()) {
    const rows = await supabaseRest<SupabaseLoggerRow[]>("pet_logger_entries", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: entry.userId,
        logged_on: entry.loggedOn,
        pet_name: entry.petName.trim(),
        meal_type: entry.mealType,
        logged_at: entry.loggedAt || null,
        food_name: entry.foodName.trim(),
        quantity: entry.quantity?.trim() || null,
        water_ml: entry.waterMl ?? null,
        treats: entry.treats?.trim() || null,
        notes: entry.notes?.trim() || null,
      }),
    })

    if (!rows[0]) throw new Error("Logger entry was not returned after saving.")
    return mapSupabaseRow(rows[0])
  }

  const created = await addDoc(collection(db, "petLoggerEntries"), {
    ...entry,
    petName: entry.petName.trim(),
    foodName: entry.foodName.trim(),
    quantity: entry.quantity?.trim() || "",
    treats: entry.treats?.trim() || "",
    notes: entry.notes?.trim() || "",
    createdAt: serverTimestamp(),
  })

  return {
    id: created.id,
    ...entry,
    petName: entry.petName.trim(),
    foodName: entry.foodName.trim(),
    createdAt: new Date().toISOString(),
  }
}

export async function deletePetLoggerEntry(
  entryId: string,
  userId: string
): Promise<void> {
  if (isSupabaseConfigured()) {
    await supabaseRest(
      `pet_logger_entries?id=eq.${encodeURIComponent(entryId)}&user_id=eq.${encodeURIComponent(userId)}`,
      { method: "DELETE", headers: { Prefer: "return=minimal" } }
    )
    return
  }

  await deleteDoc(doc(db, "petLoggerEntries", entryId))
}
