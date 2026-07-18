import React from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Clock, ChevronRight, Home, BookOpen, Tag, ThumbsUp, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SubscriptionForm } from "@/components/subscription-form";
import { getCategories, getBlogs, Blog, Category } from "@/firebase/firestore";
import { siteConfig } from "@/lib/metadata";
import type { Metadata } from "next";

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function findCategoryBySlug(categories: Category[], slug: string) {
  return categories.find((c) => slugify(c.name) === slug) ?? null;
}

function getBlogsForCategory(
  blogs: Blog[],
  categoryId: string,
  subcategoryIds: string[]
) {
  const matchIds = new Set([categoryId, ...subcategoryIds]);
  return blogs
    .filter((b) => b.status === "published")
    .filter((b) => {
      const ids = b.categoryIds?.length
        ? b.categoryIds
        : b.categoryId
          ? [b.categoryId]
          : [];
      return ids.some((id) => matchIds.has(id));
    });
}

function readTime(content: string) {
  const words = content.replace(/<[^>]*>/g, " ").trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1450778869180-41d0601e046e?q=80&w=2786&auto=format&fit=crop";

// ── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const categories = await getCategories();
  const category = findCategoryBySlug(categories, slug);

  if (!category) {
    return { title: "Category Not Found", description: "This category does not exist." };
  }

  const title = `${category.name} — Pet Care Articles`;
  const description =
    category.description ||
    `Browse our latest ${category.name.toLowerCase()} articles, expert guides, and tips for your pets.`;
  const url = `${siteConfig.url}/category/${slug}`;

  return {
    title: `${title} | ${siteConfig.name}`,
    description,
    keywords: [
      category.name.toLowerCase(),
      "pet care",
      "pet blog",
      siteConfig.name,
    ],
    openGraph: {
      type: "website",
      title,
      description,
      url,
      siteName: siteConfig.name,
      images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: { canonical: url },
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [categories, allBlogs] = await Promise.all([
    getCategories(),
    getBlogs(),
  ]);

  const category = findCategoryBySlug(categories, slug);
  if (!category) notFound();

  const isSubCategory = !!category.parentId;
  const parentCategory = isSubCategory
    ? categories.find((c) => c.id === category.parentId) ?? null
    : null;

  // Subcategories under this category (only for parent categories)
  const subcategories = categories.filter((c) => c.parentId === category.id);
  const subcategoryIds = subcategories.map((c) => c.id);

  // All published blogs in this category + its subcategories
  const blogs = getBlogsForCategory(allBlogs, category.id, subcategoryIds);

  // All parent-level categories for the sidebar
  const parentCategories = categories.filter((c) => !c.parentId);

  const getCategoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "General";

  const hasImage = !!category.imageUrl;

  return (
    <div className="bg-background min-h-screen pb-20">
      {/* Hero */}
      <section className="relative h-[360px] md:h-[420px] lg:h-[450px] pt-20 flex items-end overflow-hidden">
        {category.imageUrl ? (
          <>
            <Image
              src={category.imageUrl}
              alt={category.name}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/80" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-primary/10 to-transparent" />
            <div className="mobile-ambient-orb absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-200/30 rounded-full blur-[120px] animate-pulse" />
            <div className="mobile-ambient-orb absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
          </>
        )}

        <div className="container mx-auto px-4 pb-12 relative z-10">
          {/* Breadcrumbs */}
          <nav className={`flex items-center text-sm mb-6 gap-2 ${category.imageUrl ? 'text-white/70' : 'text-muted-foreground'}`}>
            <Link href="/" className={`inline-flex items-center gap-1 ${hasImage ? 'hover:text-white' : 'hover:text-foreground'}`}>
              <Home className="w-3.5 h-3.5" /> Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/blog" className={hasImage ? 'hover:text-white' : 'hover:text-foreground'}>Blog</Link>
            {parentCategory && (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                <Link
                  href={`/category/${slugify(parentCategory.name)}`}
                  className={hasImage ? 'hover:text-white' : 'hover:text-foreground'}
                >
                  {parentCategory.name}
                </Link>
              </>
            )}
            <ChevronRight className="w-3.5 h-3.5" />
            <span className={`font-medium ${hasImage ? 'text-white/90' : 'text-foreground'}`}>{category.name}</span>
          </nav>

          <Badge className={`mb-4 border-none px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase ${hasImage ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-600 hover:bg-orange-100'}`}>
            {isSubCategory ? "Sub-Category" : "Category"}
          </Badge>
          <h1 className={`text-4xl md:text-6xl font-extrabold tracking-tight mb-4 ${hasImage ? 'text-white drop-shadow-sm' : ''}`}>
            {category.name}
          </h1>
          {category.description && (
            <p className={`text-lg md:text-xl max-w-2xl font-medium leading-relaxed ${hasImage ? 'text-white/80' : 'text-muted-foreground'}`}>
              {category.description}
            </p>
          )}
          <div className={`mt-5 flex items-center gap-3 text-sm ${hasImage ? 'text-white/70' : 'text-muted-foreground'}`}>
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              <span className="font-semibold">{blogs.length}</span> article{blogs.length !== 1 ? "s" : ""}
            </div>
            {subcategories.length > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                <div className="flex items-center gap-1.5">
                  <Tag className="w-4 h-4" />
                  <span className="font-semibold">{subcategories.length}</span> sub-topic{subcategories.length !== 1 ? "s" : ""}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 mt-12">
        {/* Subcategory chips */}
        {subcategories.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-12">
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest mr-1">
              Sub-topics:
            </span>
            {subcategories.map((sub) => (
              <Link
                key={sub.id}
                href={`/category/${slugify(sub.name)}`}
                className="px-5 py-2 rounded-full text-sm font-bold border-2 bg-background text-muted-foreground border-transparent hover:border-primary hover:text-primary transition-all"
              >
                {sub.name}
              </Link>
            ))}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Blog grid */}
          <main className="flex-1 min-w-0">
            {blogs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                {blogs.map((blog) => (
                  <Link key={blog.id} href={`/blog/${blog.slug}`} className="group block">
                    <div className="liquid-card h-full flex flex-col overflow-hidden transition-all duration-500 group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] group-hover:-translate-y-2">
                      <div className="relative h-56 w-full overflow-hidden">
                        <Image
                          src={blog.image || DEFAULT_IMAGE}
                          alt={blog.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                        <div className="absolute top-4 left-4 flex flex-wrap gap-1.5 max-w-[calc(100%-2rem)]">
                          {(blog.categoryIds?.length ? blog.categoryIds : blog.categoryId ? [blog.categoryId] : [])
                            .slice(0, 3)
                            .map((cid) => (
                              <Badge
                                key={cid}
                                className="bg-white/80 dark:bg-black/80 backdrop-blur-md text-foreground border-none px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg"
                              >
                                {getCategoryName(cid)}
                              </Badge>
                            ))}
                        </div>
                        <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                          <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center text-primary scale-0 group-hover:scale-100 transition-transform duration-500 delay-100 shadow-xl">
                            <ChevronRight className="w-6 h-6" />
                          </div>
                        </div>
                      </div>

                      <div className="p-7 flex flex-col flex-grow">
                        <div className="flex items-center gap-4 text-xs font-bold text-primary/70 uppercase tracking-widest mb-3">
                          <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                            <Calendar className="w-3.5 h-3.5" />
                            {blog.date}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-orange-300" />
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {readTime(blog.content)} min read
                          </span>
                          {(blog.views ?? 0) > 0 && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-orange-300" />
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {(blog.views ?? 0).toLocaleString()}
                              </span>
                            </>
                          )}
                          {(blog.likes ?? 0) > 0 && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-orange-300" />
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <ThumbsUp className="w-3 h-3" />
                                {(blog.likes ?? 0).toLocaleString()}
                              </span>
                            </>
                          )}
                        </div>

                        <h3 className="text-xl font-bold mb-3 line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                          {blog.title}
                        </h3>

                        <p className="text-muted-foreground mb-6 line-clamp-3 text-sm leading-relaxed font-medium">
                          {blog.excerpt ||
                            blog.content
                              .replace(/<[^>]*>/g, "")
                              .replace(/&nbsp;/gi, " ")
                              .substring(0, 160)
                              .trim() + "..."}
                        </p>

                        <div className="mt-auto pt-5 border-t border-muted/50 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-700 dark:text-orange-300 font-bold text-xs ring-4 ring-orange-50/50 dark:ring-orange-950/20">
                              {(blog.authorName || "P")[0]}
                            </div>
                            <span className="text-xs font-bold text-foreground/80">
                              {blog.authorName || "Paw Sattva Team"}
                            </span>
                          </div>
                          <div className="text-primary font-bold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Read More <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-32 text-center">
                <div className="bg-muted/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground border-2 border-dashed border-muted">
                  <BookOpen className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold mb-2">No articles yet</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  We&apos;re working on content for this category. Check back soon or explore other topics.
                </p>
                <Link
                  href="/blog"
                  className="inline-flex mt-8 px-8 py-2.5 rounded-full border-2 border-muted text-sm font-bold hover:border-primary hover:text-primary transition-all"
                >
                  Browse All Articles
                </Link>
              </div>
            )}
          </main>

          {/* Sidebar */}
          <aside className="lg:w-72 xl:w-80 flex-shrink-0 space-y-10">
            <div className="lg:sticky lg:top-28 space-y-10">
              {/* All categories */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center">
                  <span className="w-6 h-0.5 bg-orange-500 mr-3 rounded-full" />
                  Categories
                </h3>
                <div className="space-y-1">
                  {parentCategories.map((cat) => {
                    const isActive = cat.id === category.id || cat.id === category.parentId;
                    const subs = categories.filter((c) => c.parentId === cat.id);
                    return (
                      <div key={cat.id}>
                        <Link
                          href={`/category/${slugify(cat.name)}`}
                          className={`block px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            isActive
                              ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                          }`}
                        >
                          {cat.name}
                        </Link>
                        {isActive && subs.length > 0 && (
                          <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-orange-200 pl-3">
                            {subs.map((sub) => (
                              <Link
                                key={sub.id}
                                href={`/category/${slugify(sub.name)}`}
                                className={`block px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                  sub.id === category.id
                                    ? "text-orange-600 dark:text-orange-400"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {sub.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Newsletter */}
              <div className="border-2 border-orange-100 rounded-3xl shadow-xl shadow-black/5 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-orange-400 to-orange-600" />
                <div className="p-7">
                  <h3 className="text-lg font-bold mb-2">Stay Updated</h3>
                  <p className="text-sm text-muted-foreground mb-5">
                    Get the latest {category.name.toLowerCase()} tips delivered to your inbox.
                  </p>
                  <SubscriptionForm />
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* JSON-LD structured data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              name: category.name,
              description:
                category.description ||
                `${category.name} articles and guides from ${siteConfig.name}`,
              url: `${siteConfig.url}/category/${slug}`,
              isPartOf: {
                "@type": "Blog",
                name: `${siteConfig.name} Blog`,
                url: `${siteConfig.url}/blog`,
              },
              ...(blogs.length > 0 && {
                mainEntity: {
                  "@type": "ItemList",
                  numberOfItems: blogs.length,
                  itemListElement: blogs.slice(0, 10).map((b, i) => ({
                    "@type": "ListItem",
                    position: i + 1,
                    url: `${siteConfig.url}/blog/${b.slug}`,
                    name: b.title,
                  })),
                },
              }),
            }),
          }}
        />
      </div>
    </div>
  );
}
