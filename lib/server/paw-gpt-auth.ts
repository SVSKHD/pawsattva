// Shared by the Paw GPT route handlers (/api/paw-gpt, /api/paw-gpt/speak).

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
export const firestoreBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`

/** Simple per-instance limiter so a single account cannot run up the bill. */
export function createRateLimiter(maxRequests: number, windowMs: number) {
  const recentRequests = new Map<string, number[]>()
  return function rateLimited(key: string) {
    const now = Date.now()
    const hits = (recentRequests.get(key) ?? []).filter((time) => now - time < windowMs)
    if (hits.length >= maxRequests) {
      recentRequests.set(key, hits)
      return true
    }
    hits.push(now)
    recentRequests.set(key, hits)
    return false
  }
}

function decodeTokenClaims(token: string) {
  try {
    const payload = token.split(".")[1]
    if (!payload) return null
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      user_id?: string
      sub?: string
      aud?: string
      exp?: number
      email?: string
    }
  } catch {
    return null
  }
}

/**
 * The uid and token a request claims, before they're verified. Only for starting reads early:
 * Firestore still checks the token on every call, so this grants nothing by itself.
 */
export function unverifiedCaller(req: Request) {
  const header = req.headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : ""
  const claims = token ? decodeTokenClaims(token) : null
  const uid = claims?.user_id || claims?.sub
  return token && uid ? { uid, token } : null
}

export type AuthResult =
  | { ok: true; uid: string; token: string; staff: boolean }
  | { ok: false; status: number; error: string }

/**
 * Verifies the Firebase ID token by reading the caller's own profile through the Firestore REST API.
 * Firestore checks the token signature and the security rules (owner-only read), so a forged or
 * expired token, or someone else's uid, is rejected without needing a service account.
 */
export async function authenticate(req: Request): Promise<AuthResult> {
  const header = req.headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : ""
  const claims = token ? decodeTokenClaims(token) : null
  const uid = claims?.user_id || claims?.sub
  if (!token || !claims || !uid || claims.aud !== projectId || !claims.exp || claims.exp * 1000 < Date.now()) {
    return { ok: false, status: 401, error: "Please sign in again to use Paw GPT." }
  }

  const authHeaders = { Authorization: `Bearer ${token}` }
  // restrictedEmails ids are the plain lower-cased email; rules let users look up only their own.
  // Both lookups go out together: each is a full round trip to Firestore.
  const email = claims.email?.toLowerCase()
  const [profileRes, restrictedRes] = await Promise.all([
    fetch(`${firestoreBase}/users/${encodeURIComponent(uid)}`, { headers: authHeaders, cache: "no-store" }),
    email
      ? fetch(`${firestoreBase}/restrictedEmails/${encodeURIComponent(email)}`, { headers: authHeaders, cache: "no-store" })
      : null,
  ])
  if (!profileRes.ok) {
    return { ok: false, status: 401, error: "Please sign in again to use Paw GPT." }
  }
  const profile = (await profileRes.json()) as { fields?: Record<string, { booleanValue?: boolean; stringValue?: string }> }
  if (profile.fields?.blacklisted?.booleanValue === true || restrictedRes?.ok) {
    return { ok: false, status: 403, error: "Your account is restricted." }
  }

  // Admins and authors (admin == true) have no daily question limit.
  return { ok: true, uid, token, staff: profile.fields?.admin?.booleanValue === true }
}
