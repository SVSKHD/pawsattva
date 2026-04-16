import { MetadataRoute } from "next";
import { siteConfig } from "@/lib/metadata";
import { getBlogs, getCategories } from "@/firebase/firestore";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteConfig.url,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteConfig.url}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteConfig.url}/pet-feed`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteConfig.url}/login`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Dynamic routes from Firestore
  let blogRoutes: MetadataRoute.Sitemap = [];
  let categoryRoutes: MetadataRoute.Sitemap = [];

  const slugify = (name: string) =>
    name.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, "");

  try {
    const [blogs, categories] = await Promise.all([getBlogs(), getCategories()]);

    blogRoutes = blogs
      .filter((blog) => blog.status === "published")
      .map((blog) => ({
        url: `${siteConfig.url}/blog/${blog.slug}`,
        lastModified: blog.updatedAt && typeof (blog.updatedAt as any).toDate === "function"
          ? (blog.updatedAt as any).toDate()
          : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));

    categoryRoutes = categories
      .filter((cat) => cat.status !== "draft")
      .map((cat) => ({
        url: `${siteConfig.url}/category/${slugify(cat.name)}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
  } catch (error) {
    console.error("Sitemap: Error fetching data:", error);
  }

  return [...staticRoutes, ...categoryRoutes, ...blogRoutes];
}
