/** Fields accepted by URL prefill and JSON import (same names, same defaults) */
export interface BlogImportData {
  template?: string
  title?: string
  description?: string
  excerpt?: string
  keywords?: string
  seoTitle?: string
  seoDescription?: string
  seoKeywords?: string
  content?: string
  image?: string
}

export interface BlogFormValues {
  title: string
  excerpt: string
  keywords: string
  seoTitle: string
  seoDescription: string
  seoKeywords: string
  content: string
  image: string
}

/** Single source of truth for the keys documented in the Tips panel */
export const BLOG_FIELDS: { key: string; fills: string; fallback?: string; aliases?: string }[] = [
  { key: "title", fills: "Title + auto slug" },
  { key: "description", fills: "Excerpt & SEO description source", aliases: "summary" },
  { key: "excerpt", fills: "Excerpt", fallback: "description" },
  { key: "keywords", fills: "Keywords (comma-separated)", aliases: "tags · array of strings" },
  { key: "seoTitle", fills: "SEO title", fallback: "title", aliases: "seo.title (JSON)" },
  { key: "seoDescription", fills: "SEO description", fallback: "description", aliases: "seo.description (JSON)" },
  { key: "seoKeywords", fills: "SEO keywords", fallback: "keywords", aliases: "seo.keywords (JSON)" },
  { key: "content", fills: "Article body (HTML)", aliases: "html · body (JSON)" },
  { key: "image", fills: "Featured image URL", aliases: "featuredImage · coverImage (JSON)" },
  { key: "template", fills: "soft-water-pets · medium-dog-breeds" },
]

export const BLOG_JSON_SAMPLE = `{
  "title": "Monsoon Paw Care Guide",
  "excerpt": "Simple steps to keep paws clean this rainy season.",
  "keywords": ["monsoon", "paw care", "dog health"],
  "seo": {
    "title": "Monsoon Paw Care: A Vet Guide for Dogs",
    "description": "Easy daily paw care tips for the monsoon.",
    "keywords": "monsoon dog care, paw infection"
  },
  "image": "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200",
  "content": "<h2>Why paws need care</h2><p>Wet ground traps dirt.</p><h2>Daily routine</h2><ul><li>Wipe paws after walks</li></ul>"
}`

const pickString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
    if (Array.isArray(value)) {
      const joined = value.filter((v): v is string => typeof v === "string" && !!v.trim()).map((v) => v.trim()).join(", ")
      if (joined) return joined
    }
  }
  return undefined
}

/** Parses pasted JSON into blog fields; accepts the URL param names plus a few common aliases */
export function parseBlogJson(text: string): { ok: true; data: BlogImportData } | { ok: false; error: string } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (error) {
    return { ok: false, error: `Invalid JSON — ${error instanceof Error ? error.message : "check commas and quotes"}` }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Paste a single JSON object ({ ... }), not an array or a value." }
  }
  const o = raw as Record<string, unknown>
  const seo = (o.seo && typeof o.seo === "object" ? o.seo : {}) as Record<string, unknown>

  const data: BlogImportData = {
    template: pickString(o.template),
    title: pickString(o.title),
    description: pickString(o.description, o.summary),
    excerpt: pickString(o.excerpt),
    keywords: pickString(o.keywords, o.tags),
    seoTitle: pickString(o.seoTitle, seo.title),
    seoDescription: pickString(o.seoDescription, seo.description),
    seoKeywords: pickString(o.seoKeywords, seo.keywords),
    content: pickString(o.content, o.html, o.body),
    image: pickString(o.image, o.featuredImage, o.coverImage),
  }
  if (!data.title && !data.content && !data.template) {
    return { ok: false, error: "Add at least a \"title\", \"content\" or \"template\"." }
  }
  return { ok: true, data }
}

/** Current form → JSON that parseBlogJson reads back unchanged (empty fields are left out) */
export function serializeBlog(values: BlogFormValues): string {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(values)) {
    if (value.trim()) out[key] = value.trim()
  }
  return JSON.stringify(out, null, 2)
}

// Browsers start truncating very long URLs; keep prefill links comfortably below this
export const SAFE_URL_LENGTH = 8000

export function buildPrefillUrl(origin: string, params: Record<string, string>) {
  const query = Object.entries(params)
    .filter(([, value]) => value.trim())
    .map(([key, value]) => `${key}=${encodeURIComponent(value.trim())}`)
    .join("&")
  return `${origin}/admin/blog${query ? `?${query}` : ""}`
}
