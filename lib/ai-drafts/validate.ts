import { createHash } from "node:crypto"
import sanitizeHtml from "sanitize-html"

import { imageUrlProblem } from "@/lib/image-hosts"
import type { FieldIssue } from "@/lib/server/http"
import { AI_DRAFT_LIMITS as L, type ImageAttribution } from "./types"

/**
 * Validation and sanitization for AI-submitted and moderator-edited drafts.
 * Server-only: route handlers call this before anything reaches Firestore.
 */

// ── HTML ─────────────────────────────────────────────────────────────────────

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h2", "h3", "h4", "p", "br", "hr", "ul", "ol", "li",
    "strong", "b", "em", "i", "u", "s", "blockquote", "code", "pre",
    "a", "img", "figure", "figcaption",
    "table", "caption", "thead", "tbody", "tfoot", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
    ol: ["start"],
  },
  allowedSchemes: ["https", "http", "mailto"],
  allowedSchemesByTag: { img: ["https"] },
  allowedSchemesAppliedToAttributes: ["href", "src"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  transformTags: {
    // The page already has an <h1> (the post title).
    h1: "h2",
    a: (tagName, attribs) => {
      const href = attribs.href ?? ""
      const external = /^https?:\/\//i.test(href) && !/^https:\/\/(www\.)?pawsattva\.com(\/|$)/i.test(href)
      const next: Record<string, string> = { href }
      if (attribs.title) next.title = attribs.title
      if (external || attribs.target === "_blank") {
        next.target = "_blank"
        next.rel = "noopener noreferrer nofollow"
      }
      return { tagName, attribs: next }
    },
    img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy" } }),
  },
  exclusiveFilter: (frame) => frame.tag === "img" && !frame.attribs.src,
}

// Rejection heuristics for clearly hostile input. sanitize-html is the authoritative filter;
// these exist so a malicious payload is refused outright instead of silently "cleaned".
const UNSAFE_PATTERNS: { pattern: RegExp; message: string }[] = [
  {
    pattern: /<\s*\/?\s*(script|style|iframe|frame|frameset|object|embed|applet|form|input|button|textarea|select|link|meta|base|svg|math|template|noscript)\b/i,
    message: "contains a disallowed element (script, style, iframe, form, embed, svg, …)",
  },
  { pattern: /<[^>]*?[\s"'/]on[a-z]+\s*=/i, message: "contains an inline event handler attribute (on…=)" },
  {
    pattern: /(?:href|src|action|formaction|xlink:href|srcset|poster|background)\s*=\s*["']?\s*(?:javascript|vbscript|data|file|blob)\s*:/i,
    message: "contains a URL with an unsafe protocol (javascript:, data:, vbscript:, file:)",
  },
  { pattern: /(?:href|src)\s*=\s*["']?[^"'>\s]*&#/i, message: "contains an entity-encoded URL" },
  { pattern: /<!--|<!\[CDATA\[|<\?/i, message: "contains comments, CDATA or processing instructions" },
]

export function findUnsafeHtml(html: string) {
  return UNSAFE_PATTERNS.filter(({ pattern }) => pattern.test(html)).map(({ message }) => message)
}

export function sanitizeArticleHtml(html: string) {
  const clean = sanitizeHtml(html, SANITIZE_OPTIONS).trim()
  const text = sanitizeHtml(clean, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim()
  return { html: clean, textLength: text.length }
}

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex")

export const titleFingerprint = (title: string) =>
  sha256(title.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim())

// ── Primitive checks ─────────────────────────────────────────────────────────

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

class Issues {
  list: FieldIssue[] = []
  add(field: string, message: string) {
    this.list.push({ field, message })
  }
}

function plainText(
  issues: Issues,
  field: string,
  value: unknown,
  { min = 0, max, required = true }: { min?: number; max: number; required?: boolean }
): string | undefined {
  if (value === undefined || value === null || value === "") {
    if (required) issues.add(field, "is required")
    return undefined
  }
  if (typeof value !== "string") {
    issues.add(field, "must be a string")
    return undefined
  }
  const clean = value.replace(CONTROL_CHARS, "").replace(/\s+/g, " ").trim()
  if (/<[^>]*>/.test(clean)) {
    issues.add(field, "must be plain text without HTML tags")
    return undefined
  }
  if (clean.length < min) issues.add(field, `must be at least ${min} characters`)
  else if (clean.length > max) issues.add(field, `must be at most ${max} characters`)
  return clean
}

const PRIVATE_HOST = /^(localhost|.*\.localhost|.*\.local|.*\.internal|.*\.lan|.*\.home|.*\.corp|metadata\.google\.internal)$/i
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/

/**
 * Validates a URL that is stored and shown, never fetched by the server.
 * Still refuses IP literals, internal hostnames, credentials and odd ports so a stored
 * URL can't later be turned into an SSRF or credential-leak vector.
 */
export function urlProblem(value: string, { httpsOnly }: { httpsOnly: boolean }): string | null {
  if (value.length > L.url.max) return `must be at most ${L.url.max} characters`
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return "must be an absolute URL"
  }
  if (url.protocol !== "https:" && (httpsOnly || url.protocol !== "http:")) {
    return httpsOnly ? "must use https://" : "must use http:// or https://"
  }
  if (url.username || url.password) return "must not contain credentials"
  const host = url.hostname.toLowerCase()
  if (IPV4.test(host) || host.includes(":") || host.startsWith("[")) return "must use a domain name, not an IP address"
  if (PRIVATE_HOST.test(host) || !host.includes(".")) return "must point to a public host"
  if (url.port && url.port !== "443" && url.port !== "80") return "must not use a custom port"
  return null
}

function urlField(issues: Issues, field: string, value: unknown, opts: { httpsOnly: boolean; required: boolean }) {
  const raw = plainText(issues, field, value, { max: L.url.max, required: opts.required })
  if (raw === undefined) return undefined
  const problem = urlProblem(raw, opts)
  if (problem) {
    issues.add(field, problem)
    return undefined
  }
  return new URL(raw).toString()
}

function keywordsField(issues: Issues, value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    issues.add("keywords", "must be an array of strings")
    return undefined
  }
  if (value.length < L.keywords.min || value.length > L.keywords.max) {
    issues.add("keywords", `must contain between ${L.keywords.min} and ${L.keywords.max} keywords`)
    return undefined
  }
  const seen = new Set<string>()
  const keywords: string[] = []
  value.forEach((entry, index) => {
    const keyword = plainText(issues, `keywords[${index}]`, entry, { min: L.keywords.itemMin, max: L.keywords.itemMax })
    if (keyword === undefined) return
    if (keyword.includes(",")) {
      issues.add(`keywords[${index}]`, "must not contain commas (send one keyword per item)")
      return
    }
    const key = keyword.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      keywords.push(keyword)
    }
  })
  return keywords
}

function contentField(issues: Issues, value: unknown, unsafe: string[]) {
  if (typeof value !== "string" || !value.trim()) {
    issues.add("content", typeof value === "string" ? "is required" : "must be an HTML string")
    return undefined
  }
  if (value.length > L.content.maxChars) {
    issues.add("content", `must be at most ${L.content.maxChars} characters`)
    return undefined
  }
  const problems = findUnsafeHtml(value)
  if (problems.length) {
    unsafe.push(...problems)
    return undefined
  }
  const { html, textLength } = sanitizeArticleHtml(value)
  if (textLength < L.content.minTextChars) {
    issues.add("content", `must contain at least ${L.content.minTextChars} characters of readable text`)
    return undefined
  }
  return html
}

const ATTRIBUTION_KEYS = [
  "sourceUrl", "creator", "license", "licenseUrl", "attributionText", "attributionRequired", "altText",
] as const

function attributionField(issues: Issues, value: unknown): ImageAttribution | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== "object" || Array.isArray(value)) {
    issues.add("imageAttribution", "must be an object")
    return undefined
  }
  const input = value as Record<string, unknown>
  for (const key of Object.keys(input)) {
    if (!(ATTRIBUTION_KEYS as readonly string[]).includes(key)) issues.add(`imageAttribution.${key}`, "is not a supported field")
  }
  const max = L.attributionField.max
  const result: ImageAttribution = {}
  const sourceUrl = urlField(issues, "imageAttribution.sourceUrl", input.sourceUrl, { httpsOnly: false, required: false })
  const licenseUrl = urlField(issues, "imageAttribution.licenseUrl", input.licenseUrl, { httpsOnly: false, required: false })
  const creator = plainText(issues, "imageAttribution.creator", input.creator, { max, required: false })
  const license = plainText(issues, "imageAttribution.license", input.license, { max: 120, required: false })
  const attributionText = plainText(issues, "imageAttribution.attributionText", input.attributionText, { max, required: false })
  const altText = plainText(issues, "imageAttribution.altText", input.altText, { max, required: false })
  if (sourceUrl) result.sourceUrl = sourceUrl
  if (licenseUrl) result.licenseUrl = licenseUrl
  if (creator) result.creator = creator
  if (license) result.license = license
  if (attributionText) result.attributionText = attributionText
  if (altText) result.altText = altText
  if (input.attributionRequired !== undefined) {
    if (typeof input.attributionRequired !== "boolean") issues.add("imageAttribution.attributionRequired", "must be a boolean")
    else result.attributionRequired = input.attributionRequired
  }
  if (result.attributionRequired && !result.attributionText && !result.creator) {
    issues.add("imageAttribution.attributionText", "is required when attributionRequired is true")
  }
  return result
}

// ── AI submission ────────────────────────────────────────────────────────────

const SUBMISSION_FIELDS = ["title", "excerpt", "keywords", "seoTitle", "image", "content", "seoDescription", "imageAttribution"]

/** Fields that only a moderator may ever set. Named explicitly so the error is clear. */
const PRIVILEGED_FIELDS = new Set([
  "status", "published", "publishedAt", "approved", "approvedAt", "approvedBy", "publishedBy",
  "publishedBlogId", "moderation", "role", "roles", "admin", "moderator", "source", "authorId",
  "authorName", "categoryIds", "categoryId", "slug", "createdAt", "updatedAt", "revision", "id",
  "imageRightsConfirmed",
])

export interface DraftSubmission {
  title: string
  excerpt: string
  keywords: string[]
  seoTitle: string
  seoDescription?: string
  image: string
  content: string
  imageAttribution?: ImageAttribution
}

export type ValidationResult<T> =
  | { ok: true; data: T; warnings: string[] }
  | { ok: false; kind: "invalid" | "unsafe"; issues: FieldIssue[] }

export function validateSubmission(payload: unknown): ValidationResult<DraftSubmission> {
  const issues = new Issues()
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, kind: "invalid", issues: [{ field: "body", message: "must be a JSON object" }] }
  }
  const input = payload as Record<string, unknown>
  for (const key of Object.keys(input)) {
    if (PRIVILEGED_FIELDS.has(key)) issues.add(key, "can only be set by a PawSattva moderator")
    else if (!SUBMISSION_FIELDS.includes(key)) issues.add(key, "is not a supported field")
  }

  const unsafe: string[] = []
  const title = plainText(issues, "title", input.title, L.title)
  const excerpt = plainText(issues, "excerpt", input.excerpt, L.excerpt)
  const seoTitle = plainText(issues, "seoTitle", input.seoTitle, L.seoTitle)
  const seoDescription = plainText(issues, "seoDescription", input.seoDescription, { ...L.seoDescription, required: false })
  const keywords = keywordsField(issues, input.keywords)
  const image = urlField(issues, "image", input.image, { httpsOnly: true, required: true })
  const content = contentField(issues, input.content, unsafe)
  const imageAttribution = attributionField(issues, input.imageAttribution) ?? undefined

  if (unsafe.length) {
    return { ok: false, kind: "unsafe", issues: unsafe.map((message) => ({ field: "content", message })) }
  }
  if (issues.list.length || !title || !excerpt || !seoTitle || !keywords || !image || !content) {
    return { ok: false, kind: "invalid", issues: issues.list }
  }

  const warnings: string[] = []
  const hostProblem = imageUrlProblem(image)
  if (hostProblem) warnings.push(`Featured image must be replaced or uploaded before publishing: ${hostProblem}`)
  if (!imageAttribution?.license) warnings.push("No image license was provided — confirm reuse rights before publishing.")
  if (seoTitle.length > 60) warnings.push(`SEO title is ${seoTitle.length} characters; search engines usually show about 60.`)

  return {
    ok: true,
    data: { title, excerpt, keywords, seoTitle, image, content, ...(seoDescription ? { seoDescription } : {}), ...(imageAttribution ? { imageAttribution } : {}) },
    warnings,
  }
}

// ── Moderator edit ───────────────────────────────────────────────────────────

const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export interface DraftEdit {
  title?: string
  excerpt?: string
  keywords?: string[]
  seoTitle?: string
  seoDescription?: string
  image?: string
  content?: string
  imageAttribution?: ImageAttribution | null
  slug?: string
  categoryIds?: string[]
  authorId?: string
  imageRightsConfirmed?: boolean
}

const EDIT_FIELDS = [
  "title", "excerpt", "keywords", "seoTitle", "seoDescription", "image", "content",
  "imageAttribution", "slug", "categoryIds", "authorId", "imageRightsConfirmed",
] as const

export function validateEdit(payload: Record<string, unknown>): ValidationResult<DraftEdit> {
  const issues = new Issues()
  const unsafe: string[] = []
  const data: DraftEdit = {}
  const has = (key: string) => Object.prototype.hasOwnProperty.call(payload, key)

  for (const key of Object.keys(payload)) {
    if (key !== "revision" && !(EDIT_FIELDS as readonly string[]).includes(key)) issues.add(key, "cannot be edited")
  }

  if (has("title")) data.title = plainText(issues, "title", payload.title, L.title)
  if (has("excerpt")) data.excerpt = plainText(issues, "excerpt", payload.excerpt, L.excerpt)
  if (has("seoTitle")) data.seoTitle = plainText(issues, "seoTitle", payload.seoTitle, L.seoTitle)
  if (has("seoDescription")) {
    data.seoDescription = plainText(issues, "seoDescription", payload.seoDescription, { ...L.seoDescription, required: false }) ?? ""
  }
  if (has("keywords")) data.keywords = keywordsField(issues, payload.keywords)
  if (has("image")) data.image = urlField(issues, "image", payload.image, { httpsOnly: true, required: true })
  if (has("content")) data.content = contentField(issues, payload.content, unsafe)
  if (has("imageAttribution")) data.imageAttribution = attributionField(issues, payload.imageAttribution)
  if (has("slug")) {
    const slug = plainText(issues, "slug", payload.slug, { max: L.slug.max, required: false })
    if (slug && !SLUG_PATTERN.test(slug)) issues.add("slug", "may only contain lowercase letters, numbers and single hyphens")
    else data.slug = slug ?? ""
  }
  if (has("categoryIds")) {
    const ids = payload.categoryIds
    if (!Array.isArray(ids) || ids.length > 10 || ids.some((id) => typeof id !== "string" || !ID_PATTERN.test(id))) {
      issues.add("categoryIds", "must be an array of up to 10 category ids")
    } else {
      data.categoryIds = [...new Set(ids as string[])]
    }
  }
  if (has("authorId")) {
    if (payload.authorId === "" || payload.authorId === null) data.authorId = ""
    else if (typeof payload.authorId !== "string" || !ID_PATTERN.test(payload.authorId)) issues.add("authorId", "must be a user id")
    else data.authorId = payload.authorId
  }

  if (has("imageRightsConfirmed")) {
    if (typeof payload.imageRightsConfirmed !== "boolean") issues.add("imageRightsConfirmed", "must be a boolean")
    else data.imageRightsConfirmed = payload.imageRightsConfirmed
  }

  if (unsafe.length) {
    return { ok: false, kind: "unsafe", issues: unsafe.map((message) => ({ field: "content", message })) }
  }
  if (issues.list.length) return { ok: false, kind: "invalid", issues: issues.list }

  const warnings: string[] = []
  if (data.image) {
    const hostProblem = imageUrlProblem(data.image)
    if (hostProblem) warnings.push(`Featured image must be replaced or uploaded before publishing: ${hostProblem}`)
  }
  return { ok: true, data, warnings }
}

export const isValidDocId = (id: string) => ID_PATTERN.test(id)
