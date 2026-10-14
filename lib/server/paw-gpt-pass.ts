import { FieldValue } from "firebase-admin/firestore"

import { PAW_GPT_DAILY_PASS, pawGptUsagePath } from "@/lib/paw-gpt"
import { adminDb } from "./firebase-admin"

export interface PassGrant {
  /** Who/what granted it: "payment:<provider>:<paymentId>" or "admin:<uid>" */
  source: string
  /** India day key; defaults to today */
  dayKey?: string
}

/**
 * Gives a user today's Paw GPT Daily Pass (unlimited questions up to PAW_GPT_DAILY_PASS.tokenLimit
 * tokens for the day). Server-only: Firestore rules never let users set `passTokenLimit`.
 *
 * Call this ONLY after a payment has been verified on the server (signature check / webhook),
 * never from a client-supplied "paid" flag. Idempotent per source: the same payment can't
 * grant twice.
 */
export async function grantDailyPass(uid: string, { source, dayKey }: PassGrant) {
  const db = adminDb()
  const usageRef = db.doc(pawGptUsagePath(uid, dayKey))
  const grantRef = db.collection("pawGptPassGrants").doc(source.replace(/[/\s]/g, "_").slice(0, 400))

  return db.runTransaction(async (transaction) => {
    const [grant, usage] = await Promise.all([transaction.get(grantRef), transaction.get(usageRef)])
    if (grant.exists) return { granted: false, reason: "already-granted" as const }

    const now = FieldValue.serverTimestamp()
    transaction.set(
      usageRef,
      {
        // Seed the counters if the user hasn't asked anything yet today.
        ...(usage.exists ? {} : { count: 0, tokens: 0, inputTokens: 0, outputTokens: 0 }),
        passTokenLimit: PAW_GPT_DAILY_PASS.tokenLimit,
        passSource: source,
        passGrantedAt: now,
        updatedAt: now,
      },
      { merge: true }
    )
    transaction.create(grantRef, { uid, source, dayKey: usageRef.id, tokenLimit: PAW_GPT_DAILY_PASS.tokenLimit, createdAt: now })
    return { granted: true as const }
  })
}
