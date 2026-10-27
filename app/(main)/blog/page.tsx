import { BookOpen } from "lucide-react"

import { getCategories } from "@/firebase/firestore"
import { SubscriptionForm } from "@/components/subscription-form"
import { getPublishedBlogSummaries, INITIAL_BLOG_POSTS } from "@/lib/blog-posts"
import { BlogExplorer, type BlogCategoryOption } from "./blog-explorer"

// Rendered on the server (refreshed every 5 minutes via blog/layout.tsx `revalidate`, and right
// after an admin publishes via /api/admin/blog/revalidate). Only the latest posts go in the HTML
// so the page is small and quick; BlogExplorer fetches the older ones from /api/blog/posts.
export default async function BlogPage() {
  const [posts, categories] = await Promise.all([
    getPublishedBlogSummaries(),
    getCategories().catch((error) => {
      console.error("Unable to load categories:", error)
      return []
    }),
  ])

  const categoryOptions: BlogCategoryOption[] = categories
    .filter((category) => category.status !== "draft")
    .map(({ id, name, parentId, description }) => ({ id, name, parentId, description }))
    .sort((a, b) => a.name.localeCompare(b.name))

  // Chip counts cover every post, including the ones not in the HTML yet; a post counts
  // towards its categories and their parents.
  const parentOf = new Map(categoryOptions.map((c) => [c.id, c.parentId]))
  const categoryCounts: Record<string, number> = {}
  for (const post of posts) {
    const ids = new Set<string>()
    for (const id of post.categoryIds) {
      ids.add(id)
      const parent = parentOf.get(id)
      if (parent) ids.add(parent)
    }
    ids.forEach((id) => { categoryCounts[id] = (categoryCounts[id] ?? 0) + 1 })
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="relative overflow-hidden px-4 pb-10 pt-10 md:pt-32">
        <div className="pointer-events-none absolute left-[-10%] top-0 h-72 w-72 rounded-full bg-orange-200/40 blur-[110px] dark:bg-orange-500/10" />
        <div className="pointer-events-none absolute right-[-10%] top-10 h-72 w-72 rounded-full bg-amber-200/30 blur-[110px] dark:bg-amber-500/10" />
        <div className="container relative mx-auto max-w-7xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
            <BookOpen className="h-3.5 w-3.5" /> The Paw Sattva Journal
          </p>
          <h1 className="max-w-3xl text-balance text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Insights for <span className="italic text-primary">happy</span>, healthy pets
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Practical guides on nutrition, grooming, training and everyday care — {posts.length} articles and counting.
          </p>
        </div>
      </header>

      <BlogExplorer
        initialPosts={posts.slice(0, INITIAL_BLOG_POSTS)}
        totalPosts={posts.length}
        categoryCounts={categoryCounts}
        categories={categoryOptions}
      />

      <section className="container mx-auto mt-24 max-w-7xl px-4">
        <div className="grid items-center gap-8 overflow-hidden rounded-[2rem] bg-primary p-8 text-white sm:p-12 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">New guides, straight to your inbox</h2>
            <p className="mt-3 max-w-md text-white/80">
              One short email when we publish something useful for your pet. No spam.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/20 bg-white/10 p-5 backdrop-blur-md sm:p-6">
            <SubscriptionForm />
          </div>
        </div>
      </section>
    </div>
  )
}
