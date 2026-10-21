import { adminAuth, adminDb } from "@/lib/server/firebase-admin"

/**
 * Verifies the Firebase ID token in "Authorization: Bearer …" and that the caller is staff
 * (admin or author, i.e. users/{uid}.admin == true) and not restricted.
 */
export async function verifyStaff(
  request: Request
): Promise<{ ok: true; uid: string; role: "admin" | "author" } | { ok: false; status: number; error: string }> {
  const match = /^Bearer[ \t]+(\S+)$/i.exec(request.headers.get("authorization") ?? "")
  if (!match) return { ok: false, status: 401, error: "Sign in again." }

  let uid: string
  try {
    uid = (await adminAuth().verifyIdToken(match[1], true)).uid
  } catch {
    return { ok: false, status: 401, error: "Your session has expired. Sign in again." }
  }
  const caller = (await adminDb().collection("users").doc(uid).get()).data() ?? {}
  if (caller.admin !== true || caller.blacklisted === true) {
    return { ok: false, status: 403, error: "Only admins and authors can use this." }
  }
  return { ok: true, uid, role: caller.role === "author" ? "author" : "admin" }
}

// Simple per-instance limiter so a stuck loop can't run up the AI bill.
const recentRequests = new Map<string, number[]>()

export function rateLimited(key: string, max: number, windowMs = 10 * 60 * 1000) {
  const now = Date.now()
  const hits = (recentRequests.get(key) ?? []).filter((time) => now - time < windowMs)
  hits.push(now)
  recentRequests.set(key, hits)
  return hits.length > max
}
