import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

/**
 * Firebase Admin SDK for Route Handlers only (never import from client components).
 * Credentials come from server-side env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL,
 * FIREBASE_PRIVATE_KEY. The Admin SDK bypasses Firestore security rules, so every caller
 * must do its own authorization.
 */

export class FirebaseAdminConfigError extends Error {}

/** Netlify/UI-pasted keys often arrive quoted and with literal "\n" sequences. */
function normalizePrivateKey(raw: string) {
  let key = raw.trim()
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1)
  }
  return key.replace(/\\n/g, "\n")
}

function adminApp(): App {
  if (getApps().length) return getApp()
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim()
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim()
  const privateKey = process.env.FIREBASE_PRIVATE_KEY ? normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY) : ""
  if (!projectId || !clientEmail || !privateKey) {
    // Names only — never the values.
    const missing = [
      !projectId && "FIREBASE_PROJECT_ID",
      !clientEmail && "FIREBASE_CLIENT_EMAIL",
      !privateKey && "FIREBASE_PRIVATE_KEY",
    ].filter(Boolean)
    throw new FirebaseAdminConfigError(`Firebase Admin credentials missing: ${missing.join(", ")}`)
  }
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
}

export const adminDb = () => getFirestore(adminApp())
export const adminAuth = () => getAuth(adminApp())
