/**
 * Remote hosts next/image may load from. next.config.ts builds `images.remotePatterns`
 * from this list, and safeImageSrc() checks against it so one bad URL can't crash a page.
 * A leading "**." matches any subdomain (same as Next's remotePatterns syntax).
 */
export const REMOTE_IMAGE_HOSTS = [
  "**.unsplash.com", // images.unsplash.com, plus.unsplash.com (Unsplash+)
  "lh3.googleusercontent.com",
  "firebasestorage.googleapis.com",
  "i.pravatar.cc",
  "media.istockphoto.com",
  "**.pinimg.com", // Pinterest image CDN (i.pinimg.com) — "Copy image address" on a pin
]

// Share/page links that look like images but return HTML, with how to get the real image link
const PAGE_LINKS: { host: RegExp; hint: string }[] = [
  {
    host: /(^|\.)(pin\.it|pinterest\.[a-z.]+)$/i,
    hint: "This is a Pinterest page link, not an image. Open the pin, right-click the picture and choose “Copy image address” (it starts with https://i.pinimg.com/).",
  },
  {
    host: /^(www\.)?unsplash\.com$/i,
    hint: "This is an Unsplash photo page, not an image. Open the photo, right-click it and choose “Copy image address” (it starts with https://images.unsplash.com/).",
  },
]

const hostAllowed = (hostname: string) =>
  REMOTE_IMAGE_HOSTS.some((pattern) =>
    pattern.startsWith("**.") ? hostname.endsWith(pattern.slice(2)) : hostname === pattern
  )

/** Explains why a URL can't be used as an image, or returns null when it's fine */
export function imageUrlProblem(src: string | undefined | null): string | null {
  const value = src?.trim()
  if (!value || value.startsWith("/") || value.startsWith("data:image/")) return null
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return "This isn't a valid URL."
  }
  if (url.protocol !== "https:") return "Use an https:// image link."
  const pageLink = PAGE_LINKS.find((link) => link.host.test(url.hostname))
  if (pageLink) return pageLink.hint
  if (!hostAllowed(url.hostname)) {
    return `Images from ${url.hostname} aren't allowed. Upload the image instead, or add the host to lib/image-hosts.ts.`
  }
  return null
}

/** Returns src when next/image can render it, otherwise the fallback */
export function safeImageSrc(src: string | undefined | null, fallback: string): string {
  const value = src?.trim()
  return value && !imageUrlProblem(value) ? value : fallback
}
