import { FieldValue } from "firebase-admin/firestore"
import { adminDb } from "./firebase-admin"

/**
 * In-memory sliding-window limiter. Serverless instances don't share memory, so this is
 * only a cheap first line against bursts from one IP; durable limits use firestoreWindowLimit.
 */
export function createMemoryLimiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>()
  return {
    /** Records a hit and returns true when the key is over the limit. */
    hit(key: string) {
      const now = Date.now()
      const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs)
      recent.push(now)
      hits.set(key, recent)
      if (hits.size > 5000) {
        // Drop the oldest keys so a flood of spoofed IPs can't grow the map forever.
        for (const staleKey of [...hits.keys()].slice(0, 1000)) hits.delete(staleKey)
      }
      return recent.length > max
    },
    /** Returns true when the key is already over the limit, without recording a hit. */
    blocked(key: string) {
      const now = Date.now()
      return (hits.get(key) ?? []).filter((time) => now - time < windowMs).length >= max
    },
  }
}

const RATE_LIMIT_COLLECTION = "integrationRateLimits"

/**
 * Fixed-window counter stored in Firestore, shared across every function instance.
 * Returns the number of seconds to wait when the limit is exceeded, otherwise null.
 */
export async function firestoreWindowLimit(name: string, max: number, windowSeconds: number) {
  const now = Date.now()
  const windowStart = Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000
  const ref = adminDb().collection(RATE_LIMIT_COLLECTION).doc(`${name}-${windowStart}`)
  const count = await adminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref)
    const next = ((snapshot.get("count") as number | undefined) ?? 0) + 1
    transaction.set(ref, {
      name,
      count: FieldValue.increment(1),
      windowStart: new Date(windowStart),
      // Lets a Firestore TTL policy on `expiresAt` clean up old windows.
      expiresAt: new Date(windowStart + windowSeconds * 1000 * 2),
    }, { merge: true })
    return next
  })
  if (count <= max) return null
  return Math.max(1, Math.ceil((windowStart + windowSeconds * 1000 - now) / 1000))
}
