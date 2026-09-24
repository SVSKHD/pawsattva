"use client"

import { auth } from "@/firebase/firebase"
import { getUserProfile, updateUser } from "@/firebase/firestore"

export interface LoggerContactProfile {
  userId: string
  phone: string
  whatsappPhone: string
  whatsappSameAsPhone: boolean
  updatedAt?: string
}

const assertCurrentUser = (userId: string) => {
  const currentUserId = auth.currentUser?.uid
  if (!currentUserId || currentUserId !== userId) {
    throw new Error("You must be signed in as this user.")
  }
}

export async function getLoggerContactProfile(
  userId: string
): Promise<LoggerContactProfile | null> {
  assertCurrentUser(userId)
  const profile = await getUserProfile(userId)
  if (!profile) return null

  const phone = profile.phone?.trim() ?? ""
  const whatsappSameAsPhone = profile.whatsappSameAsPhone ?? true
  const whatsappPhone = whatsappSameAsPhone
    ? phone
    : profile.whatsappPhone?.trim() ?? ""

  if (!phone && !whatsappPhone) return null

  return {
    userId,
    phone,
    whatsappPhone,
    whatsappSameAsPhone,
  }
}

export async function saveLoggerContactProfile(
  userId: string,
  profile: Pick<
    LoggerContactProfile,
    "phone" | "whatsappPhone" | "whatsappSameAsPhone"
  >
): Promise<LoggerContactProfile> {
  assertCurrentUser(userId)

  await updateUser(userId, {
    phone: profile.phone,
    whatsappPhone: profile.whatsappPhone,
    whatsappSameAsPhone: profile.whatsappSameAsPhone,
  })

  return {
    userId,
    ...profile,
    updatedAt: new Date().toISOString(),
  }
}
