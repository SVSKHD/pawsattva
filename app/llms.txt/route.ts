import { siteConfig } from "@/lib/metadata"
import { blogCategoryNames, blogSummary, blogUrl, categoryUrl, getSiteContent, PUBLIC_PAGES } from "@/lib/site-content"

/**
 * /llms.txt (llmstxt.org): a short Markdown guide to the site for AI assistants and LLM
 * crawlers: what Paw Sattva is, its main pages, and every published article with a summary.
 * /llms-full.txt has the full text of every article.
 */

export const revalidate = 3600

export async function GET() {
  const { blogs, categories, categoryNames } = await getSiteContent()

  const byCategory = new Map<string, typeof blogs>()
  for (const blog of blogs) {
    const name = blogCategoryNames(blog, categoryNames)[0] ?? "Pet care"
    byCategory.set(name, [...(byCategory.get(name) ?? []), blog])
  }

  const lines = [
    `# ${siteConfig.name}`,
    "",
    `> ${siteConfig.name} (${siteConfig.url}) is an Indian pet wellness platform for dogs and cats: expert guides on nutrition, breeds, grooming, health and training, a pet feeding planner and food logger, diet consultations, and pet-friendly walks, cafés and vet hospitals.`,
    "",
    "Articles are written for pet parents in India: portions in grams, costs in rupees, foods and breeds that suit the Indian climate. They are general guidance, not veterinary diagnosis; for anything urgent, see a veterinarian.",
    "",
    `- Full text of every article: ${siteConfig.url}/llms-full.txt`,
    `- Sitemap: ${siteConfig.url}/sitemap.xml`,
    "",
    "## Main pages",
    "",
    ...PUBLIC_PAGES.map((page) => `- [${page.title}](${siteConfig.url}${page.path === "/" ? "" : page.path}): ${page.description}`),
    "",
  ]

  for (const [name, posts] of [...byCategory.entries()].sort((a, b) => b[1].length - a[1].length)) {
    lines.push(`## ${name}`, "")
    for (const blog of posts) lines.push(`- [${blog.title.trim()}](${blogUrl(blog)}): ${blogSummary(blog, 180)}`)
    lines.push("")
  }

  if (categories.length) {
    lines.push("## Optional", "", ...categories.map((category) => `- [${category.name} articles](${categoryUrl(category)})`), "")
  }

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
  })
}
