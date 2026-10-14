import { FieldValue, type DocumentData, type Transaction } from "firebase-admin/firestore"

import { publishBlockers } from "@/lib/ai-drafts/readiness"
import {
  AI_DRAFT_ACTIONS_REQUIRING_NOTE,
  AI_DRAFT_AUDIT_SUBCOLLECTION,
  AI_DRAFT_EDITABLE_STATUSES,
  AI_DRAFT_LIMITS,
  AI_DRAFT_TRANSITIONS,
  AI_DRAFTS_COLLECTION,
  canTransition,
  type AiBlogDraft,
  type AiDraftAction,
  type AiDraftStatus,
  type ModeratorRef,
} from "@/lib/ai-drafts/types"
import { isValidDocId, sanitizeArticleHtml, sha256, validateEdit } from "@/lib/ai-drafts/validate"
import { adminDb, FirebaseAdminConfigError } from "@/lib/server/firebase-admin"
import { apiError, apiOk, BodyTooLargeError, readBodyWithLimit } from "@/lib/server/http"
import { requireModerator } from "@/lib/server/moderator-auth"

/**
 * Moderator-only operations on one AI draft.
 *   PATCH  — edit content and publishing details
 *   POST   — workflow action: start_review | approve | request_changes | reject | reopen | publish
 *
 * Every write runs in a transaction with an optimistic `revision` check and appends to
 * aiBlogDrafts/{id}/audit. Firestore rules deny all client writes to these documents.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SITE_URL = "https://pawsattva.com"
const MAX_BODY_BYTES = 600 * 1024

/** Edits to these fields void an existing approval. Publishing details (slug, categories, author) don't. */
const CONTENT_FIELDS = ["title", "excerpt", "keywords", "seoTitle", "seoDescription", "image", "content", "imageAttribution"]

class HttpFailure extends Error {
  constructor(readonly response: Response) {
    super("http-failure")
  }
}

async function readJson(request: Request) {
  if (!/^application\/json\b/i.test(request.headers.get("content-type") ?? "")) {
    throw new HttpFailure(apiError(415, "UNSUPPORTED_MEDIA_TYPE", "Send application/json."))
  }
  let raw: string
  try {
    raw = await readBodyWithLimit(request, MAX_BODY_BYTES)
  } catch (error) {
    if (error instanceof BodyTooLargeError) throw new HttpFailure(apiError(413, "PAYLOAD_TOO_LARGE", "The request is too large."))
    throw new HttpFailure(apiError(400, "INVALID_JSON", "The request body could not be read."))
  }
  try {
    const body = JSON.parse(raw)
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error()
    return body as Record<string, unknown>
  } catch {
    throw new HttpFailure(apiError(400, "INVALID_JSON", "The request body must be a JSON object."))
  }
}

function requireRevision(body: Record<string, unknown>) {
  if (typeof body.revision !== "number" || !Number.isInteger(body.revision) || body.revision < 0) {
    throw new HttpFailure(apiError(400, "VALIDATION_FAILED", "revision is required.", {
      details: [{ field: "revision", message: "must be the draft revision you are editing" }],
    }))
  }
  return body.revision
}

function loadDraftForWrite(snapshot: DocumentData | undefined, exists: boolean, revision: number) {
  if (!exists || !snapshot) throw new HttpFailure(apiError(404, "NOT_FOUND", "Draft not found."))
  if ((snapshot.revision ?? 0) !== revision) {
    throw new HttpFailure(apiError(409, "CONFLICT", "This draft changed since you opened it. Reload and try again."))
  }
  return snapshot as Omit<AiBlogDraft, "id">
}

function audit(
  transaction: Transaction,
  draftRef: FirebaseFirestore.DocumentReference,
  entry: { action: AiDraftAction | "edit"; fromStatus: AiDraftStatus; toStatus: AiDraftStatus; actor: ModeratorRef; note?: string; changedFields?: string[] }
) {
  transaction.create(draftRef.collection(AI_DRAFT_AUDIT_SUBCOLLECTION).doc(), {
    action: entry.action,
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    actor: entry.actor,
    ...(entry.note ? { note: entry.note } : {}),
    ...(entry.changedFields ? { changedFields: entry.changedFields } : {}),
    at: FieldValue.serverTimestamp(),
  })
}

async function resolveAuthor(transaction: Transaction, authorId: string) {
  const author = await transaction.get(adminDb().collection("users").doc(authorId))
  if (!author.exists || author.get("admin") !== true) {
    throw new HttpFailure(apiError(400, "VALIDATION_FAILED", "The selected author is not an admin or author account.", {
      details: [{ field: "authorId", message: "must be an admin or author" }],
    }))
  }
  return (author.get("displayName") as string) || (author.get("email") as string) || "PawSattva Team"
}

function failure(error: unknown, label: string) {
  if (error instanceof HttpFailure) return error.response
  console.error(`[ai-drafts] ${label} failed:`, error instanceof FirebaseAdminConfigError ? error.message : (error as Error)?.name)
  return error instanceof FirebaseAdminConfigError
    ? apiError(503, "NOT_CONFIGURED", "Draft storage is not configured.")
    : apiError(500, "INTERNAL_ERROR", "The change could not be saved. Try again.")
}

const sameValue = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

// ── PATCH: edit ──────────────────────────────────────────────────────────────

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireModerator(request)
  if (!auth.ok) return auth.response
  const { id } = await params
  if (!isValidDocId(id)) return apiError(404, "NOT_FOUND", "Draft not found.")

  try {
    const body = await readJson(request)
    const revision = requireRevision(body)
    const result = validateEdit(body)
    if (!result.ok) {
      return result.kind === "unsafe"
        ? apiError(400, "UNSAFE_HTML", "The article HTML contains unsafe markup.", { details: result.issues })
        : apiError(400, "VALIDATION_FAILED", "Some fields are invalid.", { details: result.issues })
    }
    const edit = result.data

    const db = adminDb()
    const draftRef = db.collection(AI_DRAFTS_COLLECTION).doc(id)
    const outcome = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(draftRef)
      const draft = loadDraftForWrite(snapshot.data(), snapshot.exists, revision)
      if (!AI_DRAFT_EDITABLE_STATUSES.includes(draft.status)) {
        throw new HttpFailure(apiError(409, "INVALID_TRANSITION", `A ${draft.status} draft can't be edited.`))
      }

      const authorName = edit.authorId ? await resolveAuthor(transaction, edit.authorId) : edit.authorId === "" ? "" : undefined
      const changed = Object.entries(edit).filter(([key, value]) => !sameValue(value, (draft as Record<string, unknown>)[key]))
      if (!changed.length) return { revision: draft.revision ?? 0, status: draft.status, changedFields: [] as string[] }

      const changedFields = changed.map(([key]) => key)
      const updates: Record<string, unknown> = Object.fromEntries(
        changed.map(([key, value]) => [key, value === null ? FieldValue.delete() : value])
      )
      if (authorName !== undefined) updates.authorName = authorName
      if (changedFields.includes("content") && edit.content) updates.contentHash = sha256(edit.content)
      // A new image (or new license details) must be re-checked by a person.
      if ((changedFields.includes("image") || changedFields.includes("imageAttribution")) && edit.imageRightsConfirmed !== true) {
        updates.imageRightsConfirmed = false
      }

      let nextStatus: AiDraftStatus = draft.status
      if (draft.status === "approved" && changedFields.some((field) => CONTENT_FIELDS.includes(field))) {
        nextStatus = "in_review"
        updates.status = nextStatus
        updates["moderation.approvedBy"] = null
        updates["moderation.approvedAt"] = null
      }
      const nextRevision = (draft.revision ?? 0) + 1
      Object.assign(updates, {
        revision: nextRevision,
        updatedAt: FieldValue.serverTimestamp(),
        "moderation.lastAction": "edit",
        "moderation.lastActionAt": FieldValue.serverTimestamp(),
        "moderation.lastActionBy": auth.moderator,
      })
      transaction.update(draftRef, updates)
      audit(transaction, draftRef, {
        action: "edit",
        fromStatus: draft.status,
        toStatus: nextStatus,
        actor: auth.moderator,
        changedFields,
        ...(nextStatus !== draft.status ? { note: "Content changed after approval; approval withdrawn." } : {}),
      })
      return { revision: nextRevision, status: nextStatus, changedFields }
    })

    return apiOk({ id, ...outcome, warnings: result.warnings })
  } catch (error) {
    return failure(error, "edit")
  }
}

// ── POST: workflow action ────────────────────────────────────────────────────

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireModerator(request)
  if (!auth.ok) return auth.response
  const { id } = await params
  if (!isValidDocId(id)) return apiError(404, "NOT_FOUND", "Draft not found.")

  try {
    const body = await readJson(request)
    const revision = requireRevision(body)
    const action = body.action as AiDraftAction
    if (typeof action !== "string" || !Object.prototype.hasOwnProperty.call(AI_DRAFT_TRANSITIONS, action)) {
      return apiError(400, "VALIDATION_FAILED", "Unknown action.", {
        details: [{ field: "action", message: `must be one of ${Object.keys(AI_DRAFT_TRANSITIONS).join(", ")}` }],
      })
    }
    const note = typeof body.note === "string" ? body.note.replace(/\s+/g, " ").trim() : ""
    if (note.length > AI_DRAFT_LIMITS.note.max) {
      return apiError(400, "VALIDATION_FAILED", "The note is too long.", { details: [{ field: "note", message: `must be at most ${AI_DRAFT_LIMITS.note.max} characters` }] })
    }
    if (AI_DRAFT_ACTIONS_REQUIRING_NOTE.includes(action) && note.length < 3) {
      return apiError(400, "VALIDATION_FAILED", "Explain the decision in a note.", { details: [{ field: "note", message: "is required for this action" }] })
    }

    const db = adminDb()
    const draftRef = db.collection(AI_DRAFTS_COLLECTION).doc(id)
    const toStatus = AI_DRAFT_TRANSITIONS[action].to

    const outcome = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(draftRef)
      const draft = loadDraftForWrite(snapshot.data(), snapshot.exists, revision)
      if (!canTransition(draft.status, action)) {
        throw new HttpFailure(apiError(409, "INVALID_TRANSITION", `Can't ${action.replace("_", " ")} a draft that is ${draft.status.replace("_", " ")}.`))
      }

      const now = FieldValue.serverTimestamp()
      const nextRevision = (draft.revision ?? 0) + 1
      const updates: Record<string, unknown> = {
        status: toStatus,
        revision: nextRevision,
        updatedAt: now,
        "moderation.lastAction": action,
        "moderation.lastActionAt": now,
        "moderation.lastActionBy": auth.moderator,
        "moderation.note": note,
      }
      if (action === "approve") {
        updates["moderation.approvedBy"] = auth.moderator
        updates["moderation.approvedAt"] = now
      } else if (action !== "publish") {
        updates["moderation.approvedBy"] = null
        updates["moderation.approvedAt"] = null
      }

      let blogId: string | null = null
      if (action === "publish") {
        blogId = await publishToBlogs(transaction, id, draft, auth.moderator)
        Object.assign(updates, { publishedAt: now, publishedBlogId: blogId, publishedBy: auth.moderator })
      }

      transaction.update(draftRef, updates)
      audit(transaction, draftRef, { action, fromStatus: draft.status, toStatus, actor: auth.moderator, note })
      return { revision: nextRevision, blogId, slug: draft.slug }
    })

    return apiOk({
      id,
      status: toStatus,
      revision: outcome.revision,
      ...(outcome.blogId ? { blogId: outcome.blogId, url: `${SITE_URL}/blog/${outcome.slug}` } : {}),
    })
  } catch (error) {
    return failure(error, "action")
  }
}

/** Creates the public blog post. Runs inside the draft's transaction so it happens at most once. */
async function publishToBlogs(transaction: Transaction, draftId: string, draft: Omit<AiBlogDraft, "id">, moderator: ModeratorRef) {
  const db = adminDb()
  if (draft.publishedBlogId) {
    throw new HttpFailure(apiError(409, "CONFLICT", "This draft has already been published."))
  }
  const blockers = publishBlockers(draft)
  if (blockers.length) {
    throw new HttpFailure(apiError(400, "VALIDATION_FAILED", "The draft isn't ready to publish.", {
      details: blockers.map((message) => ({ field: "draft", message })),
    }))
  }

  const slug = draft.slug as string
  const categoryIds = draft.categoryIds as string[]
  const [slugTaken, categories, alreadyLinked] = await Promise.all([
    transaction.get(db.collection("blogs").where("slug", "==", slug).limit(1)),
    transaction.getAll(...categoryIds.map((categoryId) => db.collection("categories").doc(categoryId))),
    transaction.get(db.collection("blogs").where("aiDraftId", "==", draftId).limit(1)),
  ])
  if (!alreadyLinked.empty) throw new HttpFailure(apiError(409, "CONFLICT", "A blog post already exists for this draft."))
  if (!slugTaken.empty) {
    throw new HttpFailure(apiError(409, "CONFLICT", `The URL /blog/${slug} is already used by another post. Change the slug.`, {
      details: [{ field: "slug", message: "is already in use" }],
    }))
  }
  if (categories.some((category) => !category.exists)) {
    throw new HttpFailure(apiError(400, "VALIDATION_FAILED", "One of the selected categories no longer exists.", {
      details: [{ field: "categoryIds", message: "contains an unknown category" }],
    }))
  }
  const authorName = await resolveAuthor(transaction, draft.authorId as string)

  // Defence in depth: content was sanitized on every write, sanitize once more on the way out.
  const content = sanitizeArticleHtml(draft.content).html
  const seoTitle = draft.seoTitle || draft.title
  const seoDescription = draft.seoDescription || draft.excerpt
  const now = FieldValue.serverTimestamp()
  const blogRef = db.collection("blogs").doc()

  // Same shape the admin blog editor writes (see handleBlogSubmit in admin-panel.tsx).
  transaction.create(blogRef, {
    title: draft.title,
    slug,
    keywords: draft.keywords.join(", "),
    excerpt: draft.excerpt,
    image: draft.image,
    content,
    seo: {
      title: seoTitle,
      description: seoDescription,
      keywords: draft.keywords,
      canonicalUrl: `${SITE_URL}/blog/${slug}`,
      robots: "index,follow",
      image: draft.image,
      ogTitle: seoTitle,
      ogDescription: seoDescription,
      ogImage: draft.image,
      twitterTitle: seoTitle,
      twitterDescription: seoDescription,
      twitterImage: draft.image,
    },
    categoryId: categoryIds[0],
    categoryIds,
    authorId: draft.authorId,
    authorName,
    status: "published",
    instagramAutoPost: false,
    instagramCaption: "",
    imageAttribution: draft.imageAttribution ?? null,
    source: "ai-integration",
    aiDraftId: draftId,
    reviewedAt: now,
    reviewedBy: moderator.uid,
    publishedAt: now,
    date: now,
    createdAt: now,
    updatedAt: now,
  })
  return blogRef.id
}
