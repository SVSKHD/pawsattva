import "server-only"

import { getBlogs, getCategories, type Blog, type Category } from "@/firebase/firestore"
import { categorySlug } from "@/lib/category-slug"
import { siteConfig } from "@/lib/metadata"

/**
 * What the public site publishes, for crawlers: the sitemap, /llms.txt and /llms-full.txt.
 * One place decides what is indexable, so all three always agree.
 */

/** Public pages with their own SEO (the keys of PageSeoKey), most important first. */
export const PUBLIC_PAGES = [
  { path: "/", title: "Home", description: "Paw Sattva: pet wellness, nutrition and care guides for dogs and cats in India.", changeFrequency: "weekly", priority: 1 },
  { path: "/blog", title: "Blog", description: "Expert pet care guides on nutrition, breeds, grooming, health and training.", changeFrequency: "daily", priority: 0.9 },
  { path: "/pet-feed", title: "Pet Feed Planner", description: "Body-condition assessment and a personalised feeding plan for your dog or cat.", changeFrequency: "monthly", priority: 0.8 },
  { path: "/consultation", title: "Pet Diet Consultation", description: "Book a diet consultation for your pet with Paw Sattva.", changeFrequency: "monthly", priority: 0.8 },
  { path: "/walks", title: "Walks, Pet-Friendly Cafés & Vet Hospitals", description: "Pet walks, pet-friendly cafés and vet hospitals near you.", changeFrequency: "weekly", priority: 0.8 },
] as const

/** Firestore Timestamp, Date, ISO string or millis → Date (null when unknown). */
export function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    const date = (value as { toDate: () => Date }).toDate()
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

export const blogUrl = (blog: Pick<Blog, "slug">) => `${siteConfig.url}/blog/${blog.slug}`
export const categoryUrl = (category: Pick<Category, "name">) => `${siteConfig.url}/category/${categorySlug(category.name)}`

/** Last change to a post: updated, else created, else its publish date. */
export const blogUpdatedAt = (blog: Blog) => toDate(blog.updatedAt) ?? toDate(blog.createdAt) ?? toDate(blog.date)
export const blogPublishedAt = (blog: Blog) => toDate(blog.date) ?? toDate(blog.createdAt)

/** Published, has a slug, not marked noindex, and its canonical (if any) points at itself. */
function isIndexable(blog: Blog) {
  if (blog.status !== "published" || !blog.slug?.trim()) return false
  if ((blog.seo?.robots ?? "").toLowerCase().includes("noindex")) return false
  const canonical = blog.seo?.canonicalUrl?.trim()
  return !canonical || canonical.replace(/\/$/, "") === blogUrl(blog)
}

export interface SiteContent {
  blogs: Blog[]
  categories: Category[]
  /** Category id → name, for labelling posts */
  categoryNames: Map<string, string>
}

/** Indexable posts (newest change first) and published categories. Empty on a Firestore error. */
export async function getSiteContent(): Promise<SiteContent> {
  const [blogs, categories] = await Promise.all([
    getBlogs().catch((error) => {
      console.error("Site content: unable to load blogs:", error)
      return [] as Blog[]
    }),
    getCategories().catch((error) => {
      console.error("Site content: unable to load categories:", error)
      return [] as Category[]
    }),
  ])
  const published = categories.filter((category) => category.status !== "draft" && category.name?.trim())
  return {
    blogs: blogs
      .filter(isIndexable)
      .sort((a, b) => (blogUpdatedAt(b)?.getTime() ?? 0) - (blogUpdatedAt(a)?.getTime() ?? 0)),
    categories: published,
    categoryNames: new Map(published.map((category) => [category.id, category.name])),
  }
}

export const blogCategoryNames = (blog: Blog, names: Map<string, string>) =>
  [...new Set([...(blog.categoryIds ?? []), blog.categoryId].filter(Boolean))]
    .map((id) => names.get(id))
    .filter((name): name is string => Boolean(name))

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…", rupee: "₹" }

const decode = (text: string) =>
  text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z0-9#]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match)

/** Post HTML → readable Markdown-ish text (headings, lists, paragraphs) for LLM crawlers. */
export function htmlToText(html: string) {
  return decode(
    html
      .replace(/<(script|style|iframe|noscript)[\s\S]*?<\/\1>/gi, "")
      .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, inner) => `\n\n${"#".repeat(Math.min(6, Number(level) + 1))} ${inner}\n\n`)
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1")
      .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) =>
        `[${inner}](${href.startsWith("/") ? siteConfig.url + href : href})`)
      .replace(/<(br|hr)\s*\/?>/gi, "\n")
      // Block boundaries, opening or closing, so paragraphs never run together ("dog.When").
      .replace(/<\/?(p|div|section|article|header|footer|aside|figure|figcaption|blockquote|ul|ol|table|thead|tbody|tr|caption|details|summary)(\s[^>]*)?>/gi, "\n\n")
      .replace(/<\/t[dh]>/gi, " | ")
      .replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, "**$2**")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export const plainText = (html: string) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()

/** The post's own summary, else the start of its text. */
export const blogSummary = (blog: Blog, max = 200) => {
  const text = (blog.excerpt?.trim() || blog.seo?.description?.trim() || plainText(blog.content)).replace(/\s+/g, " ")
  return text.length > max ? `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : text
}
