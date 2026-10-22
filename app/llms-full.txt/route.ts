import { siteConfig } from "@/lib/metadata"
import {
  blogCategoryNames,
  blogPublishedAt,
  blogSummary,
  blogUpdatedAt,
  blogUrl,
  getSiteContent,
  htmlToText,
} from "@/lib/site-content"

/** /llms-full.txt: every published article in full, as plain Markdown, for LLM crawlers. */

export const revalidate = 3600

const day = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : undefined)

export async function GET() {
  const { blogs, categoryNames } = await getSiteContent()

  const parts = [
    `# ${siteConfig.name}: all articles`,
    "",
    `> Full text of the ${blogs.length} published articles on ${siteConfig.url}, newest change first. The index is at ${siteConfig.url}/llms.txt. Articles are general pet-care guidance for dogs and cats in India, not veterinary diagnosis.`,
    "",
  ]

  for (const blog of blogs) {
    const meta = [
      `URL: ${blogUrl(blog)}`,
      blog.authorName ? `Author: ${blog.authorName}` : undefined,
      day(blogPublishedAt(blog)) ? `Published: ${day(blogPublishedAt(blog))}` : undefined,
      day(blogUpdatedAt(blog)) ? `Updated: ${day(blogUpdatedAt(blog))}` : undefined,
      blogCategoryNames(blog, categoryNames).length ? `Categories: ${blogCategoryNames(blog, categoryNames).join(", ")}` : undefined,
    ].filter((line): line is string => Boolean(line))
    parts.push(
      "---",
      "",
      `## ${blog.title.trim()}`,
      "",
      ...meta,
      "",
      `> ${blogSummary(blog, 300)}`,
      "",
      htmlToText(blog.content),
      ""
    )
  }

  return new Response(parts.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
  })
}
