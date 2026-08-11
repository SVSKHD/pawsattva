import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Roboto } from 'next/font/google';
import {
  Calendar,
  Tag,
  ChevronLeft,
  ChevronRight,
  Clock,
  BookOpen,
  MessageCircle,
  Home,
  ThumbsUp,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SocialShare } from '@/components/social-share';
import { SubscriptionForm } from '@/components/subscription-form';
import { BlogContentWithEmbeds } from '@/components/instagram-embed';
import { getBlogBySlug, getBlogs, getCategory, Blog } from '@/firebase/firestore';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { siteConfig } from '@/lib/metadata';
import ReadingEnhancements from './reading-enhancements';
import { ReadAloud } from './read-aloud';
import { BlogReactions } from '@/components/blog-reactions';
import { BlogViewTracker } from '@/components/blog-view-tracker';
import { BlogComments } from '@/components/blog-comments';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
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

  return {
    title: `${blog.title} | ${siteConfig.name}`,
    description: plainExcerpt,
    keywords: blog.keywords
      ? blog.keywords.split(',').map((k: string) => k.trim())
      : undefined,
    openGraph: {
      type: 'article',
      title: `${blog.title} | ${siteConfig.name}`,
      description: plainExcerpt,
      url: `${siteConfig.url}/blog/${slug}`,
      siteName: siteConfig.name,
      images: blog.image ? [{ url: blog.image, width: 1200, height: 630 }] : [],
      publishedTime: blog.date,
      authors: [blog.authorName || 'Paw Sattva Team'],
    },
    twitter: {
      card: 'summary_large_image',
      title: blog.title,
      description: plainExcerpt,
      images: blog.image ? [blog.image] : [],
    },
    alternates: {
      canonical: `${siteConfig.url}/blog/${slug}`,
    },
  };
}

// Decode HTML entities — handles named, decimal (&#160;), and hex (&#xA0;) forms
function decodeHtmlEntities(str: string): string {
  const named: Record<string, string> = {
    '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>',
    '&quot;': '"', '&#39;': "'", '&apos;': "'",
    '&rsquo;': '\u2019', '&lsquo;': '\u2018',
    '&rdquo;': '\u201D', '&ldquo;': '\u201C',
    '&ndash;': '\u2013', '&mdash;': '\u2014',
    '&hellip;': '\u2026', '&middot;': '\u00B7',
    '&bull;': '\u2022', '&trade;': '\u2122',
    '&copy;': '\u00A9', '&reg;': '\u00AE',
  };
  return str.replace(/&(?:#x([\da-f]+)|#(\d+)|(\w+));/gi, (_m, hex, dec, name) => {
    if (name) return named[`&${name.toLowerCase()};`] ?? _m;
    const code = hex ? parseInt(hex, 16) : parseInt(dec, 10);
    // Map non-breaking spaces and other whitespace-like chars to plain space
    if (code === 160 || code === 8203 || code === 8204) return ' ';
    return String.fromCharCode(code);
  });
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

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  const category = blog ? await getCategory(blog.categoryId) : null;

  if (!blog) notFound();

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
  const plainText = decodeHtmlEntities(blog.content.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
  const wordCount = plainText ? plainText.split(' ').length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  // TOC + enhanced HTML
  const { html: contentWithIds, toc } = injectHeadingIds(blog.content);

  const defaultImage =
    'https://images.unsplash.com/photo-1450778869180-41d0601e046e?q=80&w=2786&auto=format&fit=crop';

  const authorName = blog.authorName || 'Paw Sattva Team';
  const authorInitial = authorName[0];
  const tags = blog.keywords
    ? blog.keywords.split(',').map((tag) => tag.trim()).filter(Boolean)
    : [];

  return (
    <div className="blog-reading-page relative min-h-screen overflow-hidden bg-background">
      {/* Scroll progress + back-to-top (client) */}
      <ReadingEnhancements toc={toc} title={blog.title} />
      <BlogViewTracker blogId={blog.id} title={blog.title} />
      <div className="blog-atmosphere fixed inset-0 z-0 opacity-70" aria-hidden>
        <Image
          src={(blog?.image || defaultImage) as string}
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background" />
      </div>

      {/* Hero */}
      <header className="relative z-10 w-full min-h-[420px] md:min-h-[460px] lg:h-[60vh] lg:min-h-[650px]">
        <Image
          src={(blog?.image || defaultImage) as string}
          alt={blog.title}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        {/* Layered gradient instead of flat overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />

        <div className="relative z-10 flex flex-col justify-end min-h-[inherit] pt-24 sm:pt-28">
          <div className="container mx-auto px-3 sm:px-4 pb-6 sm:pb-14">
            {/* Breadcrumbs */}
            <nav className="flex items-center text-white/70 text-xs sm:text-sm mb-3 sm:mb-6 gap-1.5 sm:gap-2">
              <Link href="/" className="hover:text-white inline-flex items-center gap-1">
                <Home className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Home
              </Link>
              <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <Link href="/blog" className="hover:text-white">Blog</Link>
              {category?.name && (
                <>
                  <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="text-white/90">{category.name}</span>
                </>
              )}
            </nav>

            <div className="max-w-4xl">
              <Badge className="bg-orange-500 hover:bg-orange-600 text-white mb-3 sm:mb-5 uppercase tracking-wider text-[10px] sm:text-xs px-2.5 py-0.5 sm:px-3 sm:py-1">
                {category?.name || 'Uncategorized'}
              </Badge>
              <h1 className="text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-4 sm:mb-6 leading-[1.1] sm:leading-[1.05] tracking-tight drop-shadow-sm">
                {blog.title}
              </h1>

              {blog.excerpt && (
                <p className="text-lg md:text-xl text-white/85 max-w-3xl mb-8 font-light leading-relaxed hidden md:block">
                  {blog.excerpt}
                </p>
              )}

              <div className="flex flex-wrap items-center text-white/90 gap-x-4 sm:gap-x-6 gap-y-2 sm:gap-y-3">
                <div className="flex items-center">
                  <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold mr-2 sm:mr-3 border-2 border-white text-sm sm:text-lg shadow-md">
                    {authorInitial}
                  </div>
                  <div className="leading-tight">
                    <div className="font-medium text-sm sm:text-base">{authorName}</div>
                    <div className="text-[10px] sm:text-xs text-white/70">Pet Care Expert</div>
                  </div>
                </div>
                <div className="h-8 w-px bg-white/20 hidden sm:block" />
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{blog.date}</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{readTime} min read</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{wordCount.toLocaleString()} words</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3 sm:mt-5 md:mb-5">
                <ReadAloud
                  title={blog.title}
                  plainText={plainText}
                  excerpt={blog.excerpt || plainText.slice(0, 140).trimEnd() + '…'}
                />
                {(blog.views ?? 0) > 0 && (
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <Eye className="w-4 h-4" />
                    <span>{(blog.views ?? 0).toLocaleString()} views</span>
                  </div>
                )}
                {(blog.likes ?? 0) > 0 && (
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <ThumbsUp className="w-4 h-4" />
                    <span>{(blog.likes ?? 0).toLocaleString()} likes</span>
                  </div>
                )}
                {(blog.commentsCount ?? 0) > 0 && (
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <MessageCircle className="w-4 h-4" />
                    <span>{(blog.commentsCount ?? 0).toLocaleString()} comments</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container relative z-10 mx-auto px-4 py-10 sm:py-16">
        <div className="flex flex-col lg:flex-row gap-12 xl:gap-16 relative">
          {/* Sticky share rail — desktop only */}
          <div className="hidden xl:flex flex-col items-center sticky top-28 h-fit">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 rotate-180 [writing-mode:vertical-rl]">
              Share
            </div>
            <div className="flex flex-col gap-3">
              <SocialShare title={blog.title} iconOnly={true} />
            </div>
          </div>

          {/* Main */}
          <main className="lg:w-2/3 min-w-0 w-full">
            <Card className="blog-glass-card overflow-hidden border border-white/40 shadow-2xl shadow-black/10 rounded-[1.75rem] sm:rounded-[2rem]">
              <CardContent
                className={`min-w-0 p-4 sm:p-8 md:p-12 ${roboto.className}`}
              >
                <details className="mb-6 rounded-2xl border border-orange-100/60 bg-white/55 p-4 text-sm shadow-sm backdrop-blur-xl lg:hidden">
                  <summary className="cursor-pointer font-black text-orange-700">Contents</summary>
                  <ul className="mt-3 space-y-1">
                    {toc.map((item) => (
                      <li key={item.id} className={item.level === 3 ? "pl-4" : ""}>
                        <a href={`#${item.id}`} className="block py-1 text-muted-foreground hover:text-orange-600">{item.text}</a>
                      </li>
                    ))}
                  </ul>
                </details>

                {blog.excerpt && (
                  <p className="text-xl font-light text-muted-foreground mb-10 italic border-l-4 border-orange-300 pl-6 leading-relaxed md:hidden">
                    {blog.excerpt}
                  </p>
                )}

                <div className="blog-rich-content min-w-0 w-full max-w-full break-words">
                  <BlogContentWithEmbeds
                    htmlContent={contentWithIds}
                    className="prose prose-lg dark:prose-invert max-w-none
                      text-foreground/85 w-full font-light
                      prose-p:font-light prose-p:leading-[1.85] prose-p:text-[1.08rem]
                      prose-li:font-light prose-li:leading-relaxed
                      prose-a:font-medium prose-a:text-orange-600 hover:prose-a:text-orange-700 prose-a:no-underline hover:prose-a:underline prose-a:underline-offset-4
                      prose-strong:font-semibold prose-strong:text-foreground
                      prose-headings:font-bold prose-headings:tracking-tight prose-headings:scroll-mt-28
                      prose-h2:text-3xl prose-h2:mt-14 prose-h2:mb-5 prose-h2:border-b prose-h2:border-orange-100 prose-h2:pb-3
                      prose-h3:text-2xl prose-h3:mt-10 prose-h3:mb-4
                      prose-blockquote:border-l-4 prose-blockquote:border-orange-400 prose-blockquote:bg-orange-50/50 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-xl prose-blockquote:not-italic prose-blockquote:font-medium prose-blockquote:text-foreground/90
                      prose-img:rounded-2xl prose-img:shadow-lg prose-img:shadow-black/10
                      prose-pre:max-w-full prose-pre:overflow-x-auto prose-pre:rounded-xl prose-pre:bg-zinc-900
                      prose-code:text-orange-600 prose-code:bg-orange-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-medium prose-code:before:content-none prose-code:after:content-none
                      prose-hr:border-orange-100
                      min-w-0 break-words"
                  />
                </div>

                {/* End-of-article flourish */}
                <div className="flex items-center justify-center gap-3 mt-16 text-orange-400">
                  <span className="h-px w-12 bg-orange-200" />
                  <span className="text-2xl">🐾</span>
                  <span className="h-px w-12 bg-orange-200" />
                </div>
              </CardContent>
            </Card>

            {/* Likes / Dislikes */}
            <div className="flex items-center justify-center py-8">
              <BlogReactions
                blogId={blog.id}
                initialLikes={blog.likes ?? 0}
                initialDislikes={blog.dislikes ?? 0}
              />
            </div>

            <Separator className="my-8" />
            <BlogComments blogId={blog.id} />
            <Separator className="my-8" />

            {/* Tags + share */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="px-3 py-1 bg-muted hover:bg-orange-50 hover:text-orange-700 transition-colors cursor-pointer"
                  >
                    <Tag className="w-3 h-3 mr-1.5" />
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <SocialShare title={blog.title} />
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <a href="#comments">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Comment
                  </a>
                </Button>
              </div>
            </div>

            {/* Real prev / next navigation */}
            {(prevPost || nextPost) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-b border-muted py-8 mt-12 mb-16">
                {prevPost ? (
                  <Link
                    href={`/blog/${prevPost.slug}`}
                    className="group p-4 rounded-2xl hover:bg-orange-50/60 transition-colors"
                  >
                    <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold group-hover:text-orange-500 transition-colors flex items-center gap-1">
                      <ChevronLeft className="w-3 h-3" /> Previous Post
                    </span>
                    <h4 className="font-bold mt-2 group-hover:text-orange-600 transition-colors line-clamp-2">
                      {prevPost.title}
                    </h4>
                  </Link>
                ) : (
                  <div />
                )}
                {nextPost ? (
                  <Link
                    href={`/blog/${nextPost.slug}`}
                    className="group p-4 rounded-2xl hover:bg-orange-50/60 transition-colors md:text-right"
                  >
                    <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold group-hover:text-orange-500 transition-colors flex items-center md:justify-end gap-1">
                      Next Post <ChevronRight className="w-3 h-3" />
                    </span>
                    <h4 className="font-bold mt-2 group-hover:text-orange-600 transition-colors line-clamp-2">
                      {nextPost.title}
                    </h4>
                  </Link>
                ) : (
                  <div />
                )}
              </div>
            )}
          </main>

          {/* Sidebar */}
          <aside className="lg:w-1/3 space-y-10">
            <div className="lg:sticky lg:top-28 space-y-10">
              {/* Table of contents */}
              {toc.length > 0 && (
                <Card className="border border-white/35 bg-white/55 rounded-3xl shadow-sm backdrop-blur-2xl">
                  <CardContent className="p-6">
                    <h3 className="text-sm font-bold mb-4 flex items-center uppercase tracking-widest text-muted-foreground">
                      <span className="w-6 h-0.5 bg-orange-500 mr-3 rounded-full" />
                      On this page
                    </h3>
                    <ul className="space-y-1 text-sm" data-toc-list>
                      {toc.map((item) => (
                        <li
                          key={item.id}
                          className={item.level === 3 ? 'pl-4' : ''}
                        >
                          <a
                            href={`#${item.id}`}
                            data-toc-link={item.id}
                            className="block py-1.5 border-l-2 border-transparent pl-3 text-muted-foreground hover:text-orange-600 hover:border-orange-400 transition-colors line-clamp-2"
                          >
                            {item.text}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Author */}
              <Card className="overflow-hidden border-none bg-gradient-to-br from-orange-50 to-orange-100/40 shadow-none rounded-3xl">
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold mb-5">About the Author</h3>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-orange-200 flex items-center justify-center text-orange-700 text-2xl font-bold flex-shrink-0 shadow-sm">
                      {authorInitial}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{authorName}</h4>
                      <p className="text-sm text-muted-foreground">Pet Care Expert</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                    Sharing expert insights and heartfelt advice for a happier, healthier life with your pets.
                  </p>
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 rounded-xl shadow-lg shadow-orange-200/60">
                    Follow {authorName.split(' ')[0]}
                  </Button>
                </CardContent>
              </Card>

              {/* Related */}
              {related.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold mb-6 flex items-center">
                    <span className="w-8 h-1 bg-orange-500 mr-3 rounded-full" />
                    Related Articles
                  </h3>
                  <div className="space-y-5">
                    {related.map((post: Blog) => (
                      <Link
                        key={post.id}
                        href={`/blog/${post.slug}`}
                        className="group block"
                      >
                        <div className="flex gap-4 items-start">
                          <div className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 ring-2 ring-transparent group-hover:ring-orange-400 transition-all">
                            <Image
                              src={post.image || defaultImage}
                              alt={post.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                              sizes="96px"
                            />
                          </div>
                          <div className="space-y-1 min-w-0">
                            <h4 className="font-bold leading-snug text-sm group-hover:text-orange-600 transition-colors line-clamp-2">
                              {post.title}
                            </h4>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                {post.date}
                              </span>
                              {(post.likes ?? 0) > 0 && (
                                <span className="flex items-center gap-0.5 text-emerald-600">
                                  <ThumbsUp className="w-3 h-3" />
                                  {(post.likes ?? 0).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Newsletter */}
              <Card className="border-2 border-orange-100 rounded-3xl shadow-xl shadow-black/5 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-orange-400 to-orange-600" />
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold mb-2">Join our Newsletter</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Get the latest pet care tips and guides delivered to your inbox.
                  </p>
                  <SubscriptionForm />
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </div>

      {/* Drop cap + figcaption styling scoped to blog content */}
      <style>{`
        .blog-atmosphere {
          filter: blur(18px) saturate(1.18);
          transform: scale(1.05);
        }
        .blog-glass-card {
          background:
            linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.56));
          backdrop-filter: blur(28px) saturate(135%);
          -webkit-backdrop-filter: blur(28px) saturate(135%);
          box-shadow:
            0 24px 70px rgba(31, 66, 35, 0.14),
            inset 0 1px 0 rgba(255,255,255,0.74);
        }
        @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
          .blog-glass-card {
            background: rgba(255,255,255,0.94);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .blog-atmosphere {
            filter: blur(10px);
            transform: none;
          }
        }
        .blog-rich-content .prose :is(table) {
          display: block;
          width: 100%;
          max-width: 100%;
          max-height: 360px;
          overflow: auto;
          border-radius: 1rem;
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
        .blog-rich-content .prose :is(p, a, blockquote) {
          overflow-wrap: anywhere;
        }
        .blog-rich-content .prose > p:first-of-type::first-letter {
          float: left;
          font-size: 4.5rem;
          line-height: 1;
          padding: 0.3rem 0.75rem 0 0;
          font-weight: 700;
          color: rgb(234 88 12);
          font-family: Georgia, serif;
        }
        .blog-rich-content .prose figure figcaption {
          text-align: center;
          font-size: 0.875rem;
          color: rgb(115 115 115);
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
