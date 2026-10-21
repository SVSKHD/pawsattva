import { createHash, randomUUID } from "node:crypto"
import { FieldValue } from "firebase-admin/firestore"

import { PAW_GPT_GUEST_LIMIT, pawGptDayKey } from "@/lib/paw-gpt"
import { adminDb } from "./firebase-admin"

/**
 * Paw GPT for visitors who aren't signed in: PAW_GPT_GUEST_LIMIT questions in total, then they
 * must sign in. Counted with the Admin SDK (clients can't touch pawGptGuests) against:
 *   • a random id in an httpOnly cookie — the visitor's own allowance, and
 *   • a hash of their IP per day — so clearing cookies can't give unlimited free questions.
 * The IP cap is looser than the guest limit because offices and mobile networks share IPs.
 */

export const GUEST_COOKIE = "paw_gpt_guest"
const GUEST_IP_DAILY_LIMIT = 15

const hash = (value: string) =>
  createHash("sha256").update(`${process.env.PAW_GPT_GUEST_SALT ?? "paw-gpt-guest"}:${value}`).digest("hex")

/** The caller's IP as reported by the hosting proxy (best effort). */
export function clientIp(req: Request) {
  return (
    req.headers.get("x-nf-client-connection-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  )
}

/** The guest id from the cookie, or a new one to set on the response. */
export function guestIdFrom(req: Request) {
  const match = req.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${GUEST_COOKIE}=([A-Za-z0-9-]{20,64})`))
  return match ? { id: match[1], isNew: false } : { id: randomUUID(), isNew: true }
}

export const guestCookieHeader = (id: string) =>
  `${GUEST_COOKIE}=${id}; Path=/api/paw-gpt; Max-Age=31536000; HttpOnly; SameSite=Lax${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`

export type GuestQuota = { ok: true; remaining: number } | { ok: false }

/** Uses one of the visitor's free questions, atomically for both counters. */
export async function consumeGuestQuestion(guestId: string, ip: string): Promise<GuestQuota> {
  const db = adminDb()
  const guestRef = db.collection("pawGptGuests").doc(hash(`id:${guestId}`))
  const ipRef = db.collection("pawGptGuestIps").doc(`${pawGptDayKey()}_${hash(`ip:${ip}`)}`)

  return db.runTransaction(async (transaction) => {
    const [guest, ipDay] = await Promise.all([transaction.get(guestRef), transaction.get(ipRef)])
    const used = Number(guest.get("count") ?? 0)
    if (used >= PAW_GPT_GUEST_LIMIT || Number(ipDay.get("count") ?? 0) >= GUEST_IP_DAILY_LIMIT) return { ok: false }

    const now = FieldValue.serverTimestamp()
    transaction.set(guestRef, { count: FieldValue.increment(1), updatedAt: now, ...(guest.exists ? {} : { createdAt: now }) }, { merge: true })
    transaction.set(ipRef, { count: FieldValue.increment(1), updatedAt: now }, { merge: true })
    return { ok: true, remaining: PAW_GPT_GUEST_LIMIT - used - 1 }
  })
}

/** Adds an answer's tokens to the guest's totals. Best effort: the answer has already been sent. */
export async function recordGuestTokens(guestId: string, { input, output }: { input: number; output: number }) {
  if (input + output <= 0) return
  try {
    await adminDb()
      .collection("pawGptGuests")
      .doc(hash(`id:${guestId}`))
      .set(
        { tokens: FieldValue.increment(input + output), inputTokens: FieldValue.increment(input), outputTokens: FieldValue.increment(output) },
        { merge: true }
      )
  } catch (error) {
    console.error("Paw GPT: could not record guest token usage:", error)
  }
}
