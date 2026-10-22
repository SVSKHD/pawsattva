import type { MetadataRoute } from "next"

import { siteConfig } from "@/lib/metadata"
import { safeImageSrc } from "@/lib/image-hosts"
import { blogUpdatedAt, blogUrl, categoryUrl, getSiteContent, PUBLIC_PAGES } from "@/lib/site-content"

// Rebuilt at most hourly, so new posts reach search engines without a deploy.
export const revalidate = 3600

const absolute = (src: string) => (src.startsWith("/") ? `${siteConfig.url}${src}` : src)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { blogs, categories } = await getSiteContent()
  const newest = blogs.length ? blogUpdatedAt(blogs[0]) ?? undefined : undefined

  const pages: MetadataRoute.Sitemap = PUBLIC_PAGES.map((page) => ({
    url: page.path === "/" ? siteConfig.url : `${siteConfig.url}${page.path}`,
    // The home page and blog list change whenever a post does.
    lastModified: page.path === "/" || page.path === "/blog" ? newest : undefined,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))

  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => {
    const posts = blogs.filter((blog) => blog.categoryId === category.id || blog.categoryIds?.includes(category.id))
    return {
      url: categoryUrl(category),
      lastModified: posts.length ? blogUpdatedAt(posts[0]) ?? undefined : undefined,
      changeFrequency: "weekly" as const,
      priority: category.parentId ? 0.6 : 0.7,
    }
  })

  const posts: MetadataRoute.Sitemap = blogs.map((blog) => {
    const image = blog.seo?.ogImage || blog.image
    return {
      url: blogUrl(blog),
      lastModified: blogUpdatedAt(blog) ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      ...(image && safeImageSrc(image, "") ? { images: [absolute(safeImageSrc(image, ""))] } : {}),
    }
  })

  return [...pages, ...categoryPages, ...posts]
}
