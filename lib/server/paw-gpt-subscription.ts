import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { PAW_GPT_SUBSCRIPTION, pawGptSubscriptionPath } from "@/lib/paw-gpt"
import { adminDb } from "./firebase-admin"

export interface SubscriptionGrant {
  /** Who/what granted it: "payment:<provider>:<paymentId>" or "admin:<uid>" */
  source: string
  /** Billing periods to add; defaults to 1 (PAW_GPT_SUBSCRIPTION.periodDays each) */
  periods?: number
}

/**
 * Starts or extends a user's Paw GPT Plus subscription (unlimited questions, up to
 * PAW_GPT_SUBSCRIPTION.dailyTokenLimit tokens a day). Server-only: Firestore rules never let
 * users write pawGptSubscriptions.
 *
 * Call this ONLY after a payment has been verified on the server (signature check / webhook),
 * never from a client-supplied "paid" flag. Idempotent per source: the same payment can't
 * grant twice. Renewing before expiry adds the new period on top of the remaining time.
 */
export async function grantSubscription(uid: string, { source, periods = 1 }: SubscriptionGrant) {
  const db = adminDb()
  const subscriptionRef = db.doc(pawGptSubscriptionPath(uid))
  const grantRef = db.collection("pawGptSubscriptionGrants").doc(source.replace(/[/\s]/g, "_").slice(0, 400))

  return db.runTransaction(async (transaction) => {
    const [grant, current] = await Promise.all([transaction.get(grantRef), transaction.get(subscriptionRef)])
    if (grant.exists) return { granted: false, reason: "already-granted" as const }

    const now = Date.now()
    const currentUntil = (current.get("activeUntil") as Timestamp | undefined)?.toMillis() ?? 0
    const activeUntil = Timestamp.fromMillis(
      Math.max(now, currentUntil) + periods * PAW_GPT_SUBSCRIPTION.periodDays * 86_400_000
    )
    const at = FieldValue.serverTimestamp()

    transaction.set(
      subscriptionRef,
      { plan: "plus", activeUntil, lastSource: source, updatedAt: at, ...(current.exists ? {} : { startedAt: at }) },
      { merge: true }
    )
    transaction.create(grantRef, { uid, source, periods, activeUntil, createdAt: at })
    return { granted: true as const, activeUntil: activeUntil.toDate() }
  })
}
