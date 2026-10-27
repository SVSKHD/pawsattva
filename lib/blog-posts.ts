import { getBlogs } from "@/firebase/firestore"
import { toBlogSummary, type BlogSummary } from "@/app/(main)/blog/blog-summary"

/** Posts the /blog page puts in its HTML; the rest come from /api/blog/posts after the page loads */
export const INITIAL_BLOG_POSTS = 9

/**
 * Every published post as a card summary, newest first. A failed read throws rather than
 * returning []: an empty list would be cached until the next revalidation, while a thrown
 * error keeps the last good page or response being served.
 */
export async function getPublishedBlogSummaries(): Promise<BlogSummary[]> {
  const blogs = await getBlogs()
  return blogs.filter((blog) => blog.status === "published").map(toBlogSummary)
}
