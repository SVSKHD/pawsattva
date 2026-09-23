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

export async function runSqlQuery<Data, Variables>(
  name: string,
  variables: Variables
): Promise<Data> {
  const result = await executeQuery(
    queryRef<Data, Variables>(firebaseSql, name, variables),
    { fetchPolicy: QueryFetchPolicy.SERVER_ONLY }
  )
  return result.data
}

export async function runSqlQueryWithoutVariables<Data>(
  name: string
): Promise<Data> {
  const result = await executeQuery(
    queryRef<Data>(firebaseSql, name),
    { fetchPolicy: QueryFetchPolicy.SERVER_ONLY }
  )
  return result.data
}

export async function runSqlMutation<Data, Variables>(
  name: string,
  variables: Variables
): Promise<Data> {
  const result = await executeMutation(
    mutationRef<Data, Variables>(firebaseSql, name, variables)
  )
  return result.data
}
