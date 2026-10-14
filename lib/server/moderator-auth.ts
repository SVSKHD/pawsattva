import type { ModeratorRef } from "@/lib/ai-drafts/types"
import { adminAuth, adminDb } from "./firebase-admin"
import { apiError, bearerToken } from "./http"

/**
 * Server-side moderator check for the AI draft workflow.
 *
 * A moderator is a full admin, matching isFullAdmin() in firestore.rules:
 * users/{uid}.admin == true, role != "author", not blacklisted, and the
 * email is not on the restrictedEmails list. The ID token is verified with
 * the Admin SDK (signature, expiry, audience and revocation).
 */
export async function requireModerator(
  request: Request
): Promise<{ ok: true; moderator: ModeratorRef } | { ok: false; response: Response }> {
  const token = bearerToken(request)
  if (!token) return { ok: false, response: apiError(401, "UNAUTHORIZED", "Sign in again to moderate drafts.") }

  let uid: string
  let tokenEmail: string
  try {
    const decoded = await adminAuth().verifyIdToken(token, true)
    uid = decoded.uid
    tokenEmail = (decoded.email ?? "").toLowerCase()
  } catch {
    return { ok: false, response: apiError(401, "UNAUTHORIZED", "Your session has expired. Sign in again.") }
  }

  const db = adminDb()
  const [profile, restricted] = await Promise.all([
    db.collection("users").doc(uid).get(),
    tokenEmail ? db.collection("restrictedEmails").doc(tokenEmail).get() : Promise.resolve(null),
  ])
  const data = profile.data() ?? {}
  const isFullAdmin = data.admin === true && data.role !== "author" && data.blacklisted !== true
  if (!profile.exists || !isFullAdmin || restricted?.exists) {
    return { ok: false, response: apiError(403, "FORBIDDEN", "Only PawSattva admins can moderate AI drafts.") }
  }

  return {
    ok: true,
    moderator: {
      uid,
      email: tokenEmail,
      name: (typeof data.displayName === "string" && data.displayName) || tokenEmail || "Admin",
    },
  }
}
