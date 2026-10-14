import { timingSafeEqual } from "node:crypto"
import { FieldValue } from "firebase-admin/firestore"

import { AI_DRAFT_AUDIT_SUBCOLLECTION, AI_DRAFT_LIMITS, AI_DRAFTS_COLLECTION, slugify } from "@/lib/ai-drafts/types"
import { sha256, titleFingerprint, validateSubmission } from "@/lib/ai-drafts/validate"
import { adminDb, FirebaseAdminConfigError } from "@/lib/server/firebase-admin"
import { apiError, apiOk, bearerToken, BodyTooLargeError, clientIp, readBodyWithLimit } from "@/lib/server/http"
import { createMemoryLimiter, firestoreWindowLimit } from "@/lib/server/rate-limit"

/**
 * POST /api/integrations/ai/blog-drafts
 *
 * Draft intake for the ChatGPT integration. The API key can only create unpublished
 * drafts in the private `aiBlogDrafts` collection; publishing is a separate,
 * moderator-only action (see /api/admin/ai-drafts/[id]).
 * OpenAPI spec: /openapi/ai-blog-drafts.yaml
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const IDEMPOTENCY_COLLECTION = "aiBlogDraftIdempotency"
const IDEMPOTENCY_KEY = /^[A-Za-z0-9._:-]{8,128}$/

// Per-instance guards (cheap, best effort). The durable limit is the Firestore window below.
const burstLimiter = createMemoryLimiter(30, 60_000)
const failedAuthLimiter = createMemoryLimiter(10, 15 * 60_000)
const HOURLY_DRAFT_LIMIT = 30

function keyMatches(supplied: string, secret: string) {
  // Hash both sides so the comparison is constant-time regardless of length.
  const a = Buffer.from(sha256(supplied), "hex")
  const b = Buffer.from(sha256(secret), "hex")
  return timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  const ip = clientIp(request)
  if (failedAuthLimiter.blocked(ip) || burstLimiter.hit(ip)) {
    return apiError(429, "RATE_LIMITED", "Too many requests. Try again later.", { headers: { "Retry-After": "60" } })
  }

  const secret = process.env.PAWSATTVA_DRAFT_API_KEY?.trim()
  if (!secret) {
    console.error("[ai-blog-drafts] PAWSATTVA_DRAFT_API_KEY is not set")
    return apiError(503, "NOT_CONFIGURED", "Draft intake is not configured.")
  }
  const supplied = bearerToken(request)
  if (!supplied || !keyMatches(supplied, secret)) {
    failedAuthLimiter.hit(ip)
    return apiError(401, "UNAUTHORIZED", "A valid Bearer API key is required.", {
      headers: { "WWW-Authenticate": 'Bearer realm="pawsattva-ai-drafts"' },
    })
  }

  const contentType = request.headers.get("content-type") ?? ""
  if (!/^application\/json\b/i.test(contentType)) {
    return apiError(415, "UNSUPPORTED_MEDIA_TYPE", "Send the draft as application/json.")
  }

  let raw: string
  try {
    raw = await readBodyWithLimit(request, AI_DRAFT_LIMITS.maxBodyBytes)
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return apiError(413, "PAYLOAD_TOO_LARGE", `The request body must be at most ${AI_DRAFT_LIMITS.maxBodyBytes} bytes.`)
    }
    return apiError(400, "INVALID_JSON", "The request body could not be read.")
  }

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return apiError(400, "INVALID_JSON", "The request body is not valid JSON.")
  }

  const idempotencyKey = request.headers.get("idempotency-key")?.trim() || ""
  if (idempotencyKey && !IDEMPOTENCY_KEY.test(idempotencyKey)) {
    return apiError(400, "VALIDATION_FAILED", "Invalid Idempotency-Key header.", {
      details: [{ field: "Idempotency-Key", message: "must be 8-128 characters of letters, digits, . _ : -" }],
    })
  }

  const result = validateSubmission(payload)
  if (!result.ok) {
    return result.kind === "unsafe"
      ? apiError(400, "UNSAFE_HTML", "The article HTML contains unsafe markup and was rejected.", { details: result.issues })
      : apiError(400, "VALIDATION_FAILED", "The draft failed validation.", { details: result.issues })
  }
  const draft = result.data

  try {
    const retryAfter = await firestoreWindowLimit("ai-blog-drafts", HOURLY_DRAFT_LIMIT, 3600)
    if (retryAfter) {
      return apiError(429, "RATE_LIMITED", `At most ${HOURLY_DRAFT_LIMIT} drafts can be submitted per hour.`, {
        headers: { "Retry-After": String(retryAfter) },
      })
    }

    const db = adminDb()
    const fingerprint = titleFingerprint(draft.title)
    const contentHash = sha256(draft.content)
    const requestHash = sha256(JSON.stringify(draft))
    const draftRef = db.collection(AI_DRAFTS_COLLECTION).doc(fingerprint)
    const idempotencyRef = idempotencyKey ? db.collection(IDEMPOTENCY_COLLECTION).doc(sha256(idempotencyKey)) : null

    const outcome = await db.runTransaction(async (transaction) => {
      const [idempotencySnap, existing] = await Promise.all([
        idempotencyRef ? transaction.get(idempotencyRef) : Promise.resolve(null),
        transaction.get(draftRef),
      ])

      if (idempotencySnap?.exists) {
        if (idempotencySnap.get("requestHash") !== requestHash) return { kind: "key-reused" as const }
        const replayRef = db.collection(AI_DRAFTS_COLLECTION).doc(idempotencySnap.get("draftId") as string)
        const replay = await transaction.get(replayRef)
        return { kind: "duplicate" as const, id: replayRef.id, status: (replay.get("status") as string) ?? "draft" }
      }

      if (existing.exists) {
        if (idempotencyRef) {
          transaction.create(idempotencyRef, { draftId: draftRef.id, requestHash, createdAt: FieldValue.serverTimestamp() })
        }
        return { kind: "duplicate" as const, id: draftRef.id, status: (existing.get("status") as string) ?? "draft" }
      }

      const now = FieldValue.serverTimestamp()
      // Status and publication fields are fixed here; nothing from the request can set them.
      transaction.create(draftRef, {
        ...draft,
        status: "draft",
        publishedAt: null,
        publishedBlogId: null,
        publishedBy: null,
        source: "ai-integration",
        slug: slugify(draft.title),
        categoryIds: [],
        authorId: "",
        authorName: "",
        imageRightsConfirmed: false,
        moderation: { lastAction: "submit", lastActionAt: now, lastActionBy: null, note: "", approvedBy: null, approvedAt: null },
        titleFingerprint: fingerprint,
        contentHash,
        submission: {
          userAgent: (request.headers.get("user-agent") ?? "").slice(0, 200),
          idempotencyKeyHash: idempotencyRef?.id ?? null,
        },
        revision: 1,
        createdAt: now,
        updatedAt: now,
      })
      transaction.create(draftRef.collection(AI_DRAFT_AUDIT_SUBCOLLECTION).doc(), {
        action: "submit",
        fromStatus: null,
        toStatus: "draft",
        actor: { uid: "ai-integration", email: "", name: "AI integration" },
        at: now,
      })
      if (idempotencyRef) {
        transaction.create(idempotencyRef, { draftId: draftRef.id, requestHash, createdAt: now })
      }
      return { kind: "created" as const, id: draftRef.id }
    })

    if (outcome.kind === "key-reused") {
      return apiError(422, "IDEMPOTENCY_KEY_REUSED", "This Idempotency-Key was already used with a different draft.")
    }
    if (outcome.kind === "duplicate") {
      return apiOk({
        id: outcome.id,
        status: outcome.status,
        created: false,
        duplicate: true,
        message: "A draft with this title already exists; no new draft was created.",
      })
    }
    return apiOk({ id: outcome.id, status: "draft", created: true, warnings: result.warnings }, 201)
  } catch (error) {
    // Log the error type only; never the request body or credentials.
    console.error("[ai-blog-drafts] save failed:", error instanceof FirebaseAdminConfigError ? error.message : (error as Error)?.name)
    return error instanceof FirebaseAdminConfigError
      ? apiError(503, "NOT_CONFIGURED", "Draft storage is not configured.")
      : apiError(500, "INTERNAL_ERROR", "The draft could not be saved. Try again later.")
  }
}
