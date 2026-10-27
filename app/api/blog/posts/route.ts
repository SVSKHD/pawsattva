import { NextResponse } from "next/server"

import { getPublishedBlogSummaries } from "@/lib/blog-posts"

/**
 * GET /api/blog/posts
 * All published post summaries, newest first. The /blog page renders only the latest few and
 * fetches this once it has loaded. Cached like the page (5 minutes, and refreshed right after
 * an admin publishes via /api/admin/blog/revalidate).
 */

export const dynamic = "force-static"
export const revalidate = 300

export async function GET() {
  return NextResponse.json({ posts: await getPublishedBlogSummaries() })
}
