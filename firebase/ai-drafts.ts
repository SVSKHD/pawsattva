import { collection, onSnapshot, orderBy, query } from "firebase/firestore"
import { db } from "./db"
import { auth } from "./firebase"
import {
  AI_DRAFT_AUDIT_SUBCOLLECTION,
  AI_DRAFTS_COLLECTION,
  type AiBlogDraft,
  type AiDraftAction,
  type AiDraftAuditEntry,
} from "@/lib/ai-drafts/types"

// Reads go straight to Firestore (rules allow full admins only).
// Writes go through /api/admin/ai-drafts so the server can enforce the workflow.

export const onAiDraftsSnapshot = (
  callback: (drafts: AiBlogDraft[]) => void,
  onError?: (error: Error) => void
) =>
  onSnapshot(
    query(collection(db, AI_DRAFTS_COLLECTION), orderBy("createdAt", "desc")),
    (snapshot) => callback(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() } as AiBlogDraft))),
    onError
  )

export const onAiDraftAuditSnapshot = (
  draftId: string,
  callback: (entries: AiDraftAuditEntry[]) => void,
  onError?: (error: Error) => void
) =>
  onSnapshot(
    query(collection(db, AI_DRAFTS_COLLECTION, draftId, AI_DRAFT_AUDIT_SUBCOLLECTION), orderBy("at", "desc")),
    (snapshot) => callback(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() } as AiDraftAuditEntry))),
    onError
  )

export class AiDraftApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string, readonly details: { field: string; message: string }[] = []) {
    super(message)
  }
}

async function callModeratorApi<T>(draftId: string, method: "PATCH" | "POST", body: Record<string, unknown>): Promise<T> {
  const user = auth.currentUser
  if (!user) throw new AiDraftApiError("Sign in again to continue.", 401)
  const token = await user.getIdToken()
  const response = await fetch(`/api/admin/ai-drafts/${encodeURIComponent(draftId)}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.success) {
    throw new AiDraftApiError(
      data?.error?.message || "Something went wrong. Try again.",
      response.status,
      data?.error?.code,
      data?.error?.details
    )
  }
  return data as T
}

export type AiDraftEditInput = Partial<
  Pick<
    AiBlogDraft,
    "title" | "excerpt" | "keywords" | "seoTitle" | "seoDescription" | "image" | "content" | "slug" | "categoryIds" | "authorId" | "imageRightsConfirmed"
  >
> & { imageAttribution?: AiBlogDraft["imageAttribution"] | null }

export const editAiDraft = (draftId: string, revision: number, changes: AiDraftEditInput) =>
  callModeratorApi<{ revision: number; status: string; changedFields: string[]; warnings: string[] }>(
    draftId, "PATCH", { ...changes, revision }
  )

export const runAiDraftAction = (draftId: string, revision: number, action: AiDraftAction, note = "") =>
  callModeratorApi<{ status: string; revision: number; blogId?: string; url?: string }>(
    draftId, "POST", { action, note, revision }
  )
