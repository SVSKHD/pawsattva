import type { Blog } from "@/firebase/firestore"
import { safeImageSrc } from "@/lib/image-hosts"

export const DEFAULT_BLOG_IMAGE =
  "https://images.unsplash.com/photo-1450778869180-41d0601e046e?q=80&w=2786&auto=format&fit=crop"

/** Just what a card needs — the full article body never leaves the server on the list page */
export interface BlogSummary {
  id: string
  slug: string
  title: string
  excerpt: string
  image: string
  date: string
  readMinutes: number
  views: number
  likes: number
  dislikes: number
  comments: number
  authorName: string
  categoryIds: string[]
  /** Lower-cased title + excerpt + keywords, for instant client-side search */
  searchText: string
}

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
  ndash: "–", mdash: "—", hellip: "…",
}

function toPlainText(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:#x([\da-f]+)|#(\d+)|(\w+));/gi, (match, hex, dec, name) => {
      if (name) return NAMED_ENTITIES[name.toLowerCase()] ?? match
      const code = hex ? parseInt(hex, 16) : parseInt(dec, 10)
      return code === 160 || code === 8203 ? " " : String.fromCharCode(code)
    })
    .replace(/\s+/g, " ")
    .trim()
}

const clip = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, max).replace(/\s+\S*$/, "")}…`

export function toBlogSummary(blog: Blog): BlogSummary {
  const plain = toPlainText(blog.content || "")
  const words = plain ? plain.split(" ").length : 0
  const excerpt = blog.excerpt?.trim() ? toPlainText(blog.excerpt) : clip(plain, 180)

  return {
    id: blog.id,
    slug: blog.slug,
    title: blog.title,
    excerpt,
    image: safeImageSrc(blog.image, DEFAULT_BLOG_IMAGE),
    date: typeof blog.date === "string" ? blog.date : "",
    readMinutes: Math.max(1, Math.ceil(words / 200)),
    views: blog.views ?? 0,
    likes: blog.likes ?? 0,
    dislikes: blog.dislikes ?? 0,
    comments: blog.commentsCount ?? 0,
    authorName: blog.authorName || "Paw Sattva Team",
    categoryIds: blog.categoryIds?.length ? blog.categoryIds : blog.categoryId ? [blog.categoryId] : [],
    searchText: `${blog.title} ${excerpt} ${blog.keywords || ""}`.toLowerCase(),
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "2026-09-30" → "30 Sep 2026", computed from the string so server and browser always agree */
export const formatBlogDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return value
  const [, year, month, day] = match
  return `${Number(day)} ${MONTHS[Number(month) - 1] ?? ""} ${year}`
}
