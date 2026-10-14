import { NextResponse } from "next/server"

import { pawGptDayKey } from "@/lib/paw-gpt"
import { adminAuth, adminDb, FirebaseAdminConfigError } from "@/lib/server/firebase-admin"
import { grantDailyPass } from "@/lib/server/paw-gpt-pass"

/**
 * POST /api/admin/paw-gpt/daily-pass  { uid }
 * Lets a full admin give a pet parent today's Daily Pass (support, goodwill, testing).
 * Paid passes go through grantDailyPass() from the payment verification instead.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const json = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } })

export async function POST(request: Request) {
  const match = /^Bearer[ \t]+(\S+)$/i.exec(request.headers.get("authorization") ?? "")
  if (!match) return json(401, { error: "Sign in again." })

  try {
    let callerUid: string
    try {
      callerUid = (await adminAuth().verifyIdToken(match[1], true)).uid
    } catch {
      return json(401, { error: "Your session has expired. Sign in again." })
    }
    const caller = (await adminDb().collection("users").doc(callerUid).get()).data() ?? {}
    const fullAdmin = caller.admin === true && caller.role !== "author" && caller.blacklisted !== true
    if (!fullAdmin) return json(403, { error: "Only admins can give a Daily Pass." })

    const body = (await request.json().catch(() => null)) as { uid?: unknown } | null
    const uid = typeof body?.uid === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(body.uid) ? body.uid : ""
    if (!uid) return json(400, { error: "uid is required." })
    if (!(await adminDb().collection("users").doc(uid).get()).exists) return json(404, { error: "User not found." })

    const dayKey = pawGptDayKey()
    const result = await grantDailyPass(uid, { source: `admin:${callerUid}:${uid}:${dayKey}`, dayKey })
    return json(200, { ok: true, ...result, dayKey })
  } catch (error) {
    console.error("Daily Pass grant failed:", error instanceof FirebaseAdminConfigError ? error.message : (error as Error)?.name)
    return json(error instanceof FirebaseAdminConfigError ? 503 : 500, { error: "Could not give the Daily Pass." })
  }
}
