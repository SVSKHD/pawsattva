"use client"

import { auth } from "@/firebase/firebase"
import {
  runSqlMutation,
  runSqlQueryWithoutVariables,
} from "@/lib/firebase-sql-connect"

export interface LoggerContactProfile {
  userId: string
  phone: string
  whatsappPhone: string
  whatsappSameAsPhone: boolean
  updatedAt?: string
}

type ProfileData = {
  loggerProfile: LoggerContactProfile | null
}

type SaveProfileData = {
  loggerProfile_upsert: LoggerContactProfile
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
  const data = await runSqlQueryWithoutVariables<ProfileData>(
    "GetMyLoggerProfile"
  )
  return data.loggerProfile
}

export async function saveLoggerContactProfile(
  userId: string,
  profile: Pick<
    LoggerContactProfile,
    "phone" | "whatsappPhone" | "whatsappSameAsPhone"
  >
): Promise<LoggerContactProfile> {
  assertCurrentUser(userId)

  const data = await runSqlMutation<
    SaveProfileData,
    {
      phone: string
      whatsappPhone: string
      whatsappSameAsPhone: boolean
    }
  >("SaveMyLoggerProfile", profile)

  return data.loggerProfile_upsert
}
