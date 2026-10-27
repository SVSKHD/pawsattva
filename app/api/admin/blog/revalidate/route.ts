import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"

import { FirebaseAdminConfigError } from "@/lib/server/firebase-admin"
import { verifyStaff } from "@/lib/server/staff-auth"

/**
 * POST /api/admin/blog/revalidate
 * Called by the admin panel after a post is created, edited, approved or deleted, or its SEO
 * is changed, so the cached public pages (ISR, `revalidate = 300`) show the change on the
 * next visit instead of up to 5 minutes later. Staff only.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const json = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } })

export async function POST(request: Request) {
  try {
    const staff = await verifyStaff(request)
    if (!staff.ok) return json(staff.status, { error: staff.error })

    // Posts and page SEO show on the home, blog, post and category pages and in their
    // metadata; the site is small, so refresh every page under the root layout.
    revalidatePath("/", "layout")
    revalidatePath("/api/blog/posts")
    revalidatePath("/sitemap.xml")
    revalidatePath("/llms.txt")
    revalidatePath("/llms-full.txt")

    return json(200, { revalidated: true })
  } catch (error) {
    console.error("Blog revalidation failed:", error instanceof FirebaseAdminConfigError ? error.message : error)
    return json(error instanceof FirebaseAdminConfigError ? 503 : 500, { error: "Couldn't refresh the public blog pages." })
  }
}
