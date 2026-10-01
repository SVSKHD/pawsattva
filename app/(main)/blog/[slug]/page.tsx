import React from 'react';
import Image from 'next/image';
import { safeImageSrc } from '@/lib/image-hosts';
import Link from 'next/link';
import { Source_Serif_4 } from 'next/font/google';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronRight,
  Clock,
  Eye,
  Home,
  MessageCircle,
  Tag,
  ThumbsUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SocialShare } from '@/components/social-share';
import { SubscriptionForm } from '@/components/subscription-form';
import { BlogContentWithEmbeds } from '@/components/instagram-embed';
import { getBlogBySlug, getBlogs, getCategory, Blog } from '@/firebase/firestore';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { siteConfig } from '@/lib/metadata';
import ReadingEnhancements from './reading-enhancements';
import { BlogHeroParallax } from './blog-hero-parallax';
import { ReadAloud } from './read-aloud';
import { BlogReactions } from '@/components/blog-reactions';
import { BlogViewTracker } from '@/components/blog-view-tracker';
import { BlogComments } from '@/components/blog-comments';
import { Footer } from '@/components/footer';

// Serif body text for long-form reading; headings keep the site's sans font
const readingSerif = Source_Serif_4({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog) {
    return {
      title: 'Post Not Found',
      description: 'The blog post you are looking for could not be found.',
    };
  }

  const plainExcerpt =
    blog.excerpt ||
    blog.content.replace(/<[^>]*>/g, '').substring(0, 160) + '...';
  const seo = blog.seo;
  const title = seo?.title || blog.title;
  const description = seo?.description || plainExcerpt;
  const canonical = seo?.canonicalUrl || `${siteConfig.url}/blog/${slug}`;
  const socialImage = seo?.ogImage || seo?.image || blog.image;
  const robots = (seo?.robots || "index,follow").toLowerCase();

  return {
    title: `${title} | ${siteConfig.name}`,
    description,
    keywords: seo?.keywords?.length
      ? seo.keywords
      : blog.keywords
        ? blog.keywords.split(',').map((k: string) => k.trim())
        : undefined,
    robots: {
      index: !robots.includes("noindex"),
      follow: !robots.includes("nofollow"),
    },
    openGraph: {
      type: 'article',
      title: seo?.ogTitle || title,
      description: seo?.ogDescription || description,
      url: canonical,
      siteName: siteConfig.name,
      images: socialImage ? [{ url: socialImage, width: 1200, height: 630 }] : [],
      publishedTime: blog.date,
      authors: [blog.authorName || 'Paw Sattva Team'],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo?.twitterTitle || title,
      description: seo?.twitterDescription || description,
      images: seo?.twitterImage ? [seo.twitterImage] : socialImage ? [socialImage] : [],
    },
    alternates: {
      canonical,
    },
  };
}

// Decode HTML entities — handles named, decimal (&#160;), and hex (&#xA0;) forms
function decodeHtmlEntities(str: string): string {
  const named: Record<string, string> = {
    '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>',
    '&quot;': '"', '&#39;': "'", '&apos;': "'",
    '&rsquo;': '’', '&lsquo;': '‘',
    '&rdquo;': '”', '&ldquo;': '“',
    '&ndash;': '–', '&mdash;': '—',
    '&hellip;': '…', '&middot;': '·',
    '&bull;': '•', '&trade;': '™',
    '&copy;': '©', '&reg;': '®',
  };
  return str.replace(/&(?:#x([\da-f]+)|#(\d+)|(\w+));/gi, (_m, hex, dec, name) => {
    if (name) return named[`&${name.toLowerCase()};`] ?? _m;
    const code = hex ? parseInt(hex, 16) : parseInt(dec, 10);
    // Map non-breaking spaces and other whitespace-like chars to plain space
    if (code === 160 || code === 8203 || code === 8204) return ' ';
    return String.fromCharCode(code);
  });
}

function toPlainText(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function readTimeFor(html: string): number {
  const text = toPlainText(html);
  const words = text ? text.split(' ').length : 0;
  return Math.max(1, Math.ceil(words / 200));
}

// Inject ids onto h2/h3 so the TOC can link to them
function injectHeadingIds(html: string): { html: string; toc: { id: string; text: string; level: number }[] } {
  const toc: { id: string; text: string; level: number }[] = [];

  const slugify = (s: string) =>
    decodeHtmlEntities(s)
      .toLowerCase()
      .replace(/<[^>]*>/g, '')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60);

  const used = new Set<string>();
  const html2 = html.replace(
    /<(h2|h3)([^>]*)>([\s\S]*?)<\/\1>/gi,
    (_m, tag: string, attrs: string, inner: string) => {
      // Decode entities for display text and strip tracking tags
      const text = decodeHtmlEntities(inner.replace(/<[^>]*>/g, '')).trim();
      if (!text) return _m;

      let id = slugify(text) || `section-${toc.length + 1}`;
      let n = 1;
      while (used.has(id)) id = `${id}-${++n}`;
      used.add(id);

      toc.push({ id, text, level: tag.toLowerCase() === 'h2' ? 2 : 3 });

      // Keep existing attrs but override/add id
      const cleanedAttrs = attrs.replace(/\sid="[^"]*"/i, '');
      return `<${tag}${cleanedAttrs} id="${id}">${inner}</${tag}>`;
    }
  );
  return { html: html2, toc };
}

const defaultImage =
  'https://images.unsplash.com/photo-1450778869180-41d0601e046e?q=80&w=2786&auto=format&fit=crop';

function PostNavCard({ post, direction }: { post: Blog; direction: 'prev' | 'next' }) {
  const isNext = direction === 'next';
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-3 pr-5 transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-lg hover:shadow-orange-950/5 ${isNext ? 'flex-row-reverse text-right' : ''}`}
    >
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl">
        <Image
          src={safeImageSrc(post.image, defaultImage)}
          alt=""
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="80px"
        />
      </div>
      <div className="min-w-0">
        <span className={`flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground group-hover:text-orange-600 ${isNext ? 'justify-end' : ''}`}>
          {isNext ? <>Next <ArrowRight className="h-3 w-3" /></> : <><ArrowLeft className="h-3 w-3" /> Previous</>}
        </span>
        <h4 className="mt-1 line-clamp-2 font-bold leading-snug transition-colors group-hover:text-orange-600">
          {post.title}
        </h4>
      </div>
    </Link>
  );
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  const category = blog ? await getCategory(blog.categoryId) : null;

  if (!blog) notFound();

  let managedBlogSchema: Record<string, unknown> | null = null;
  if (blog.seo?.schemaJson?.trim()) {
    try {
      managedBlogSchema = JSON.parse(blog.seo.schemaJson);
    } catch {
      managedBlogSchema = null;
    }
  }

  const allBlogs = await getBlogs();
  const published = allBlogs.filter((b) => b.status === 'published');

  // Real prev/next from the published list
  const currentIdx = published.findIndex((b) => b.id === blog.id);
  const prevPost = currentIdx > 0 ? published[currentIdx - 1] : null;
  const nextPost =
    currentIdx >= 0 && currentIdx < published.length - 1
      ? published[currentIdx + 1]
      : null;

  // Related: same category first, fall back to latest
  const sameCat = published.filter(
    (b) => b.id !== blog.id && b.categoryId === blog.categoryId
  );
  const related = (sameCat.length ? sameCat : published.filter((b) => b.id !== blog.id)).slice(0, 3);

  // Stats
  const plainText = toPlainText(blog.content);
  const wordCount = plainText ? plainText.split(' ').length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  // TOC + enhanced HTML
  const { html: contentWithIds, toc } = injectHeadingIds(blog.content);

  const authorName = blog.authorName || 'Paw Sattva Team';
  const authorInitial = authorName[0];
  const tags = blog.keywords
    ? blog.keywords.split(',').map((tag) => tag.trim()).filter(Boolean)
    : [];

  return (
    <div className="blog-reading-page relative min-h-screen bg-background">
      {managedBlogSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(managedBlogSchema).replace(/</g, "\\u003c"),
          }}
        />
      )}
      <BlogHeroParallax />
      <BlogViewTracker blogId={blog.id} title={blog.title} />
      <div className="blog-hero-glow pointer-events-none absolute inset-x-0 top-0 h-[520px]" aria-hidden />

      {/* Desktop: a full-viewport split view — the window never scrolls, the left panel stays still and
          only the right column scrolls (it ends with the site footer, hidden from the layout on this page).
          Mobile: both columns use `display: contents` so their parts stack as intro → article → comments → more. */}
      <div className="relative container mx-auto max-w-7xl px-4 pb-12 pt-28 sm:pb-16 sm:pt-32 lg:h-dvh lg:pb-6 lg:pt-28">
        <div className="grid gap-10 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)] xl:gap-16">
          <aside className="blog-left contents lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden">
            <div className="order-1 lg:order-none lg:shrink-0">
              <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
                <Link href="/" className="inline-flex items-center gap-1 hover:text-orange-600">
                  <Home className="h-3.5 w-3.5" /> Home
                </Link>
                <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                <Link href="/blog" className="hover:text-orange-600">Blog</Link>
                {category?.name && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                    <span className="truncate text-foreground/80">{category.name}</span>
                  </>
                )}
              </nav>

              <div>
                <Badge className="mb-4 rounded-full bg-orange-500 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white hover:bg-orange-600">
                  {category?.name || 'Uncategorized'}
                </Badge>
              </div>

              <h1 className="text-balance text-3xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-4xl xl:text-[2.6rem]">
                {blog.title}
              </h1>

              {blog.excerpt && (
                <p className={`${readingSerif.className} mt-4 text-pretty text-lg leading-relaxed text-muted-foreground lg:line-clamp-2 lg:text-base`}>
                  {blog.excerpt}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                    {authorInitial}
                  </span>
                  <span className="font-semibold text-foreground">{authorName}</span>
                </span>
                <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{blog.date}</span>
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{readTime} min read</span>
                {(blog.views ?? 0) > 0 && (
                  <span className="flex items-center gap-1.5"><Eye className="h-4 w-4" />{(blog.views ?? 0).toLocaleString()}</span>
                )}
              </div>

              <div className="mt-5">
                <ReadAloud title={blog.title} plainText={plainText} variant="card" />
              </div>
            </div>

            {/* Middle slot: contents list, swapped out for the comments when they are open */}
            {toc.length > 0 ? (
              <nav aria-label="Table of contents" className="blog-left-toc mt-6 hidden min-h-0 flex-1 flex-col lg:flex">
                <p className="mb-3 shrink-0 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  On this page
                </p>
                <ul className="blog-left-toc-list min-h-0 space-y-0.5 overflow-y-auto border-l border-border text-sm">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        data-toc-link={item.id}
                        className={`-ml-px block border-l-2 border-transparent py-1.5 leading-snug text-muted-foreground transition-colors hover:border-orange-300 hover:text-foreground ${item.level === 3 ? 'pl-7 text-[13px]' : 'pl-4'}`}
                      >
                        {item.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : (
              <div className="blog-left-toc hidden flex-1 lg:block" aria-hidden />
            )}

            {/* Scroll progress — sits right above the comments and only appears while scrolling */}
            <ReadingEnhancements toc={toc} readTime={readTime} />

            <div className="blog-left-comments order-3 lg:order-none lg:mt-4">
              <BlogComments blogId={blog.id} />
            </div>

            <div className="mt-4 hidden shrink-0 items-center gap-2 border-t border-border/70 pt-4 lg:flex">
              <span className="mr-auto text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Share</span>
              <SocialShare title={blog.title} iconOnly />
              <a
                href="#comments"
                aria-label="Jump to comments"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-orange-100 text-muted-foreground transition-colors hover:bg-orange-50 hover:text-orange-600 dark:border-border dark:hover:bg-orange-950/30"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </aside>

          {/* Right column — the only scrolling region on desktop */}
          <div data-blog-scroller className="blog-right-scroll contents lg:block lg:h-full lg:min-h-0 lg:min-w-0 lg:overflow-y-auto lg:overscroll-contain">
          <div className="contents lg:block lg:max-w-[760px]">
          <article data-reading-article className="order-2 w-full min-w-0 lg:order-none">
            <figure
              data-blog-hero-media
              className="blog-hero-media relative aspect-[4/3] overflow-hidden rounded-[1.5rem] shadow-2xl shadow-orange-950/10 sm:aspect-[16/10] sm:rounded-[2rem]"
            >
              <Image
                src={safeImageSrc(blog.image, defaultImage)}
                alt={blog.title}
                fill
                priority
                className="blog-hero-image object-cover"
                sizes="(min-width: 1280px) 760px, (min-width: 1024px) 60vw, 100vw"
              />
            </figure>

            {toc.length > 0 && (
              <details className="group mt-8 rounded-2xl border border-border/70 bg-muted/40 p-4 text-sm lg:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between font-bold">
                  On this page
                  <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                </summary>
                <ul className="mt-3 space-y-1 border-t border-border/70 pt-3">
                  {toc.map((item) => (
                    <li key={item.id} className={item.level === 3 ? 'pl-4' : ''}>
                      <a href={`#${item.id}`} className="block py-1 text-muted-foreground hover:text-orange-600">{item.text}</a>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <div data-reading-content className={`blog-rich-content mt-10 min-w-0 w-full max-w-full break-words ${readingSerif.className}`}>
              <BlogContentWithEmbeds
                htmlContent={contentWithIds}
                className="prose prose-lg dark:prose-invert max-w-none w-full min-w-0 break-words
                  text-foreground/85
                  prose-p:leading-[1.8] prose-p:text-[1.15rem]
                  prose-li:leading-relaxed prose-li:text-[1.1rem]
                  prose-a:font-medium prose-a:text-orange-600 prose-a:underline prose-a:decoration-orange-300 prose-a:underline-offset-4 hover:prose-a:decoration-orange-600
                  prose-strong:font-semibold prose-strong:text-foreground
                  prose-headings:font-sans prose-headings:font-extrabold prose-headings:tracking-tight prose-headings:text-foreground prose-headings:scroll-mt-28
                  prose-h2:text-[1.75rem] prose-h2:mt-14 prose-h2:mb-4
                  prose-h3:text-[1.35rem] prose-h3:mt-10 prose-h3:mb-3
                  prose-blockquote:border-l-4 prose-blockquote:border-orange-400 prose-blockquote:bg-orange-50/60 dark:prose-blockquote:bg-orange-950/20 prose-blockquote:py-1 prose-blockquote:px-6 prose-blockquote:rounded-r-xl prose-blockquote:not-italic prose-blockquote:text-foreground/90
                  prose-img:rounded-2xl prose-img:shadow-lg prose-img:shadow-black/10
                  prose-pre:max-w-full prose-pre:overflow-x-auto prose-pre:rounded-xl prose-pre:bg-zinc-900
                  prose-code:font-mono prose-code:text-orange-600 prose-code:bg-orange-50 dark:prose-code:bg-orange-950/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-medium prose-code:before:content-none prose-code:after:content-none
                  prose-hr:border-border"
              />
            </div>

            <div className="mt-14 flex items-center justify-center gap-3 text-orange-400" aria-hidden>
              <span className="h-px w-12 bg-orange-200 dark:bg-orange-900" />
              <span className="text-2xl">🐾</span>
              <span className="h-px w-12 bg-orange-200 dark:bg-orange-900" />
            </div>

            {/* End-of-article panel */}
            <section className="mt-12 rounded-[1.75rem] border border-border/70 bg-muted/30 p-6 sm:p-8">
              <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
                <div>
                  <h2 className="text-lg font-bold">Was this helpful?</h2>
                  <p className="text-sm text-muted-foreground">Your feedback helps us write better guides.</p>
                </div>
                <BlogReactions
                  blogId={blog.id}
                  initialLikes={blog.likes ?? 0}
                  initialDislikes={blog.dislikes ?? 0}
                />
              </div>

              {tags.length > 0 && (
                <div className="mt-6 flex flex-wrap justify-center gap-2 border-t border-border/70 pt-6 sm:justify-start">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="rounded-full px-3 py-1 font-medium">
                      <Tag className="mr-1.5 h-3 w-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 border-t border-border/70 pt-6 sm:justify-between">
                <span className="text-sm font-medium text-muted-foreground">Share this guide with a fellow pet parent</span>
                <div className="flex items-center gap-2">
                  <SocialShare title={blog.title} />
                  <a
                    href="#comments"
                    className="inline-flex h-8 items-center gap-2 rounded-full border border-orange-100 px-3 text-sm font-medium transition-colors hover:bg-orange-50 hover:text-orange-600 dark:border-border dark:hover:bg-orange-950/30"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {(blog.commentsCount ?? 0) > 0 ? (blog.commentsCount ?? 0).toLocaleString() : 'Comment'}
                  </a>
                </div>
              </div>
            </section>

            {/* Author */}
            <section className="mt-8 flex flex-col items-center gap-5 rounded-[1.75rem] bg-gradient-to-br from-orange-50 to-amber-50/50 p-6 text-center dark:from-orange-950/30 dark:to-transparent sm:flex-row sm:items-start sm:p-8 sm:text-left">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-200 text-2xl font-bold text-orange-700 shadow-sm dark:bg-orange-900/60 dark:text-orange-200">
                {authorInitial}
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-600">Written by</p>
                <h2 className="mt-1 text-xl font-bold">{authorName}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Sharing expert insights and heartfelt advice for a happier, healthier life with your pets.
                </p>
              </div>
            </section>

            {(prevPost || nextPost) && (
              <nav aria-label="More posts" className="mt-8 grid gap-4 sm:grid-cols-2">
                {prevPost ? <PostNavCard post={prevPost} direction="prev" /> : <div className="hidden sm:block" />}
                {nextPost && <PostNavCard post={nextPost} direction="next" />}
              </nav>
            )}
          </article>

          <div className="order-4 min-w-0 lg:order-none">
            {/* Keep reading */}
            {related.length > 0 && (
              <section className="mt-16 border-t border-border/70 pt-12">
                <div className="mb-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-600">Keep reading</p>
                    <h2 className="mt-1 text-2xl font-extrabold tracking-tight">
                      {sameCat.length && category?.name ? `More on ${category.name}` : 'Latest from the blog'}
                    </h2>
                  </div>
                  <Link href="/blog" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700">
                    All articles <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {related.map((post) => (
                    <Link
                      key={post.id}
                      href={`/blog/${post.slug}`}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-950/5"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <Image
                          src={safeImageSrc(post.image, defaultImage)}
                          alt=""
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(min-width: 1280px) 240px, (min-width: 640px) 50vw, 100vw"
                        />
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <h3 className="line-clamp-2 font-bold leading-snug transition-colors group-hover:text-orange-600">
                          {post.title}
                        </h3>
                        <div className="mt-auto flex items-center gap-3 pt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{post.date}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{readTimeFor(post.content)} min</span>
                          {(post.likes ?? 0) > 0 && (
                            <span className="flex items-center gap-1 text-emerald-600"><ThumbsUp className="h-3.5 w-3.5" />{(post.likes ?? 0).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Newsletter */}
            <section className="mt-12 rounded-[1.75rem] bg-gradient-to-br from-orange-500 to-amber-500 p-6 text-white shadow-2xl shadow-orange-500/20 sm:p-8">
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Get guides like this in your inbox</h2>
              <p className="mt-2 text-white/85">Practical pet care tips from the Paw Sattva team. No spam, unsubscribe anytime.</p>
              <div className="mt-6 rounded-2xl bg-white p-5 text-foreground shadow-lg dark:bg-zinc-900">
                <SubscriptionForm />
              </div>
            </section>
          </div>
          </div>

          {/* Site footer lives at the end of the scrolling column on desktop */}
          <div className="blog-right-footer mt-16 hidden lg:block">
            <Footer />
          </div>
          </div>
        </div>
      </div>


      <style>{`
        .blog-hero-glow {
          background:
            radial-gradient(60% 70% at 50% 0%, rgba(251, 146, 60, 0.16), transparent 70%),
            radial-gradient(40% 50% at 85% 10%, rgba(52, 211, 153, 0.08), transparent 70%);
        }
        /* Desktop split view: lock the window; only the right column scrolls */
        @media (min-width: 1024px) {
          html:has(.blog-reading-page) {
            overflow: hidden;
          }
          main:has(.blog-reading-page) > footer {
            display: none;
          }
          /* Scrolls by wheel, touch and keyboard without a visible scrollbar */
          .blog-right-scroll {
            scrollbar-width: none;
          }
          .blog-right-scroll::-webkit-scrollbar {
            display: none;
          }
          .blog-right-scroll .prose :is(h2, h3) {
            scroll-margin-top: 1.5rem;
          }
          /* The footer is built for full width; tighten it for the column */
          .blog-right-footer footer {
            padding: 3rem 1.5rem 2rem;
            border-radius: 1.75rem 1.75rem 0 0;
          }
          .blog-right-footer footer > div:first-of-type {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 2.5rem;
          }
          .blog-right-footer footer > div:first-of-type > :first-child {
            grid-column: 1 / -1;
          }
          .blog-right-footer footer > div:last-of-type {
            margin-top: 2.5rem;
          }
        }
        /* Pinned left panel: a long contents list fits its slot without a visible scrollbar */
        .blog-left-toc-list {
          scrollbar-width: none;
        }
        .blog-left-toc-list::-webkit-scrollbar {
          display: none;
        }
        /* Open comments take over the contents slot; only the comment list scrolls, inside its card */
        @media (min-width: 1024px) {
          .blog-left:has(#comments[data-open="true"]) .blog-left-toc {
            display: none;
          }
          .blog-left:has(#comments[data-open="true"]) .blog-left-comments {
            display: flex;
            flex: 1 1 0;
            min-height: 0;
            margin-top: 1.5rem;
          }
          .blog-left-comments #comments {
            display: flex;
            flex-direction: column;
            width: 100%;
            max-height: 100%;
            min-height: 0;
          }
          .blog-left-comments #comments-panel {
            flex: 1 1 auto;
            min-height: 0;
          }
        }
        /* Cover photo drifts within its frame as it scrolls away */
        .blog-hero-media {
          /* Keeps rounded corners clipped while the inner image is transformed (Chrome/Safari) */
          clip-path: inset(0 round 1.5rem);
        }
        @media (min-width: 640px) {
          .blog-hero-media {
            clip-path: inset(0 round 2rem);
          }
        }
        .blog-hero-image {
          transform: translate3d(0, calc(var(--blog-hero-progress, 0) * 48px), 0) scale(1.1);
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .blog-hero-image {
            transform: none;
          }
        }
        [data-toc-link][data-active="true"] {
          border-color: rgb(249 115 22);
          color: var(--foreground);
          font-weight: 600;
        }
        .blog-rich-content .prose :is(table) {
          display: block;
          width: 100%;
          max-width: 100%;
          max-height: 360px;
          overflow: auto;
          border-radius: 1rem;
          font-family: var(--font-montserrat, sans-serif);
          font-size: 0.95rem;
        }
        .blog-rich-content .prose :is(ol, ul) {
          max-width: 100%;
          margin-inline: 0;
        }
        .blog-rich-content .prose ol {
          padding-inline-start: 3rem;
          list-style-position: outside;
        }
        .blog-rich-content .prose ul {
          padding-inline-start: 2rem;
          list-style-position: outside;
        }
        .blog-rich-content .prose li {
          padding-inline-start: 0.25rem;
          overflow-wrap: anywhere;
        }
        .blog-rich-content .prose li::marker {
          color: rgb(249 115 22);
        }
        .blog-rich-content .prose :is(p, a, blockquote) {
          overflow-wrap: anywhere;
        }
        .blog-rich-content .prose > p:first-of-type::first-letter {
          float: left;
          font-size: 4.25rem;
          line-height: 0.9;
          padding: 0.35rem 0.6rem 0 0;
          font-weight: 700;
          color: rgb(234 88 12);
        }
        .blog-rich-content .prose figure figcaption {
          text-align: center;
          font-size: 0.875rem;
          color: var(--muted-foreground);
          margin-top: 0.75rem;
          font-style: italic;
        }
        @media (max-width: 639px) {
          .blog-rich-content .prose ol {
            padding-inline-start: 3.25rem;
          }
          .blog-rich-content .prose ol ol {
            padding-inline-start: 2.75rem;
          }
          .blog-rich-content .prose ul {
            padding-inline-start: 2.25rem;
          }
        }
      `}</style>
    </div>
  );
}
