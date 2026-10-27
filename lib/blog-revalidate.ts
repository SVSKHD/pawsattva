import { auth } from "@/firebase/firebase"

/**
 * Tells the server to drop its cached copies of the public blog pages, so a post that was
 * just published, edited or deleted shows on the next refresh instead of after the 5-minute
 * ISR window. Never throws: the change is already saved and the cache expires on its own.
 */
export async function refreshPublicBlogPages() {
  try {
    const token = await auth.currentUser?.getIdToken()
    if (!token) return false
    const res = await fetch("/api/admin/blog/revalidate", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) console.warn("Blog pages could not be refreshed:", res.status)
    return res.ok
  } catch (error) {
    console.warn("Blog pages could not be refreshed:", error)
    return false
  }
}
