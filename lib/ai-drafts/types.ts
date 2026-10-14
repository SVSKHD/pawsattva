/**
 * AI blog draft moderation — shared types and workflow rules.
 *
 * Drafts submitted by the AI integration live in the private `aiBlogDrafts` collection
 * (readable by full admins only, writable only by the server). A public `blogs` document
 * is created only when a moderator publishes an approved draft.
 *
 * Imported by both the server route handlers and the admin UI, so keep it dependency-free.
 */

export const AI_DRAFTS_COLLECTION = "aiBlogDrafts"
export const AI_DRAFT_AUDIT_SUBCOLLECTION = "audit"

export const AI_DRAFT_STATUSES = [
  "draft",
  "in_review",
  "changes_requested",
  "approved",
  "rejected",
  "published",
] as const

export type AiDraftStatus = (typeof AI_DRAFT_STATUSES)[number]

export const AI_DRAFT_STATUS_LABEL: Record<AiDraftStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  changes_requested: "Changes requested",
  approved: "Approved",
  rejected: "Rejected",
  published: "Published",
}

/** Statuses that still need a moderator's attention (drives the nav badge). */
export const AI_DRAFT_PENDING_STATUSES: readonly AiDraftStatus[] = ["draft", "in_review"]

/** Content can be edited until the draft is published or rejected. */
export const AI_DRAFT_EDITABLE_STATUSES: readonly AiDraftStatus[] = [
  "draft",
  "in_review",
  "changes_requested",
  "approved",
]

export type AiDraftAction =
  | "start_review"
  | "approve"
  | "request_changes"
  | "reject"
  | "reopen"
  | "publish"

/** Allowed status transitions. Anything not listed is refused by the server. */
export const AI_DRAFT_TRANSITIONS: Record<AiDraftAction, { from: readonly AiDraftStatus[]; to: AiDraftStatus }> = {
  start_review: { from: ["draft", "changes_requested"], to: "in_review" },
  approve: { from: ["draft", "in_review"], to: "approved" },
  request_changes: { from: ["draft", "in_review", "approved"], to: "changes_requested" },
  reject: { from: ["draft", "in_review", "changes_requested", "approved"], to: "rejected" },
  reopen: { from: ["rejected", "changes_requested"], to: "in_review" },
  publish: { from: ["approved"], to: "published" },
}

/** Actions that must carry a moderator note explaining the decision. */
export const AI_DRAFT_ACTIONS_REQUIRING_NOTE: readonly AiDraftAction[] = ["request_changes", "reject"]

export const canTransition = (status: AiDraftStatus, action: AiDraftAction) =>
  AI_DRAFT_TRANSITIONS[action].from.includes(status)

export interface ImageAttribution {
  /** Page the image was found on (not the image file itself). */
  sourceUrl?: string
  creator?: string
  license?: string
  licenseUrl?: string
  /** Credit line that must be shown with the image, when the license requires one. */
  attributionText?: string
  attributionRequired?: boolean
  altText?: string
}

export interface ModeratorRef {
  uid: string
  email: string
  name: string
}

/** Firestore timestamps arrive as Timestamp objects on the client; keep this loose. */
type TimestampLike = { toDate: () => Date } | null | undefined

export interface AiBlogDraft {
  id: string
  title: string
  excerpt: string
  keywords: string[]
  seoTitle: string
  seoDescription?: string
  image: string
  content: string
  imageAttribution?: ImageAttribution
  status: AiDraftStatus
  source: "ai-integration"
  publishedAt: TimestampLike
  createdAt?: TimestampLike
  updatedAt?: TimestampLike
  /** Bumped on every server write; used for optimistic concurrency in the editor. */
  revision?: number
  // Moderator-chosen publishing details
  slug?: string
  categoryIds?: string[]
  authorId?: string
  authorName?: string
  // Moderation metadata
  moderation?: {
    lastAction?: AiDraftAction | "edit" | "submit"
    lastActionAt?: TimestampLike
    lastActionBy?: ModeratorRef
    note?: string
    approvedBy?: ModeratorRef | null
    approvedAt?: TimestampLike
  }
  publishedBlogId?: string | null
  publishedBy?: ModeratorRef | null
  /** Set only by a moderator after checking the image license; required to publish. */
  imageRightsConfirmed?: boolean
  titleFingerprint?: string
  contentHash?: string
}

export interface AiDraftAuditEntry {
  id: string
  action: AiDraftAction | "edit" | "submit"
  fromStatus: AiDraftStatus | null
  toStatus: AiDraftStatus
  actor: ModeratorRef | { uid: "ai-integration"; email: ""; name: "AI integration" }
  note?: string
  changedFields?: string[]
  at?: TimestampLike
}

/** Field limits shared by the API validator and the moderator editor. */
export const AI_DRAFT_LIMITS = {
  maxBodyBytes: 256 * 1024,
  title: { min: 10, max: 160 },
  excerpt: { min: 20, max: 500 },
  seoTitle: { min: 10, max: 120 },
  seoDescription: { max: 320 },
  keywords: { min: 1, max: 20, itemMin: 2, itemMax: 80 },
  content: { maxChars: 120_000, minTextChars: 200 },
  url: { max: 2048 },
  attributionField: { max: 300 },
  slug: { max: 120 },
  note: { max: 2000 },
} as const

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, AI_DRAFT_LIMITS.slug.max)
