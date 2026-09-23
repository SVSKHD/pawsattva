"use client"

import {
  executeMutation,
  executeQuery,
  getDataConnect,
  mutationRef,
  queryRef,
  QueryFetchPolicy,
} from "firebase/data-connect"

import { app } from "@/firebase/firebase"

const connectorConfig = {
  connector:
    process.env.NEXT_PUBLIC_FIREBASE_SQL_CONNECTOR_ID?.trim() || "logger",
  location:
    process.env.NEXT_PUBLIC_FIREBASE_SQL_LOCATION?.trim() || "asia-south1",
  service:
    process.env.NEXT_PUBLIC_FIREBASE_SQL_SERVICE_ID?.trim() || "pawsattva-logger",
}

export const firebaseSql = getDataConnect(app, connectorConfig)

export class FirebaseSqlUnavailableError extends Error {
  readonly code = "FIREBASE_SQL_UNAVAILABLE"

  constructor(message = "Firebase SQL Connect is currently unavailable.") {
    super(message)
    this.name = "FirebaseSqlUnavailableError"
  }
}

let sqlUnavailable = false

const errorText = (error: unknown) => {
  if (error instanceof Error) return `${error.name}: ${error.message}`
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

export const isFirebaseSqlUnavailableError = (error: unknown) => {
  if (error instanceof FirebaseSqlUnavailableError) return true
  const text = errorText(error)
  return (
    text.includes("SERVICE_DISABLED") ||
    (text.includes("PERMISSION_DENIED") &&
      text.includes("firebasedataconnect.googleapis.com"))
  )
}

export const resetFirebaseSqlUnavailableState = () => {
  sqlUnavailable = false
}

const runWithSqlAvailabilityGuard = async <T>(operation: () => Promise<T>) => {
  if (sqlUnavailable) {
    throw new FirebaseSqlUnavailableError()
  }

  try {
    return await operation()
  } catch (error) {
    if (isFirebaseSqlUnavailableError(error)) {
      sqlUnavailable = true
      throw new FirebaseSqlUnavailableError(
        "Firebase SQL Connect API is disabled or unavailable for this project."
      )
    }
    throw error
  }
}

export async function runSqlQuery<Data, Variables>(
  name: string,
  variables: Variables
): Promise<Data> {
  return runWithSqlAvailabilityGuard(async () => {
    const result = await executeQuery(
      queryRef<Data, Variables>(firebaseSql, name, variables),
      { fetchPolicy: QueryFetchPolicy.SERVER_ONLY }
    )
    return result.data
  })
}

export async function runSqlQueryWithoutVariables<Data>(
  name: string
): Promise<Data> {
  return runWithSqlAvailabilityGuard(async () => {
    const result = await executeQuery(
      queryRef<Data>(firebaseSql, name),
      { fetchPolicy: QueryFetchPolicy.SERVER_ONLY }
    )
    return result.data
  })
}

export async function runSqlMutation<Data, Variables>(
  name: string,
  variables: Variables
): Promise<Data> {
  return runWithSqlAvailabilityGuard(async () => {
    const result = await executeMutation(
      mutationRef<Data, Variables>(firebaseSql, name, variables)
    )
    return result.data
  })
}
