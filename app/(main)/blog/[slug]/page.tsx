import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Tag, ChevronLeft, Share2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SocialShare } from '@/components/social-share';
import { SubscriptionForm } from '@/components/subscription-form';
import { getBlogBySlug, getBlogs, getCategory, Blog } from '@/firebase/firestore';
import { notFound } from 'next/navigation';

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  const category = blog ? await getCategory(blog.categoryId) : null;

  if (!blog) {
    notFound();
  }

  // Fetch some related posts
  const allBlogs = await getBlogs();
  const relatedPosts = allBlogs
    .filter(b => b.id !== blog.id && b.status === "published")
    .slice(0, 2);

  const calculateReadTime = (content: string) => {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length || 1;
    return Math.ceil(words / wordsPerMinute) + " min read";
  };

  const defaultImage = "https://images.unsplash.com/photo-1450778869180-41d0601e046e?q=80&w=2786&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

  return (

    <div className="bg-background min-h-screen">
      {/* Hero Header Section */}
      <div className="relative w-full h-[50vh] min-h-[400px]">
        <Image
          src={(blog?.image || defaultImage) as string}
          alt={blog.title}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div className="absolute inset-0 flex items-end">
          <div className="container mx-auto px-4 pb-12">
            <Link
              href="/blog"
              className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Blog
            </Link>
            <div className="max-w-4xl">
              <Badge className="bg-orange-500 hover:bg-orange-600 text-white mb-4">
                {category?.name || "Uncategorized"}
              </Badge>
              <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
                {blog.title}
              </h1>
              <div className="flex flex-wrap items-center text-white/90 gap-6">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold mr-3 border-2 border-white text-xl">
                    {(blog.authorName || "P")[0]}
                  </div>
                  <span className="font-medium text-lg">{blog.authorName || "Paw Sattva Team"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>{blog.date}</span>
                </div>
                <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-white/40" />
                <span>{calculateReadTime(blog.content)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col lg:flex-row gap-16">
          {/* Main Content Area */}
          <main className="lg:w-2/3">
            {blog.excerpt && (
              <p className="text-xl font-medium text-muted-foreground mb-10 italic border-l-4 border-orange-200 pl-6 leading-relaxed">
                {blog.excerpt}
              </p>
            )}

            <div
              className="prose prose-lg dark:prose-invert max-w-none text-foreground/80"
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />

            <Separator className="my-12" />

            {/* Tags & Interaction */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex flex-wrap gap-2">
                {blog.keywords?.split(',').map((tag: string) => (
                  <Badge key={tag.trim()} variant="secondary" className="px-3 py-1 bg-muted hover:bg-orange-50 transition-colors">
                    <Tag className="w-3 h-3 mr-1.5" />
                    {tag.trim()}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <SocialShare title={blog.title} />
                <Button variant="outline" size="sm" className="rounded-full">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Comment
                </Button>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex border-t border-b border-muted py-8 mt-12 mb-16">
              <div className="w-1/2 pr-4 border-r border-muted group cursor-pointer">
                <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold group-hover:text-orange-500 transition-colors">Previous Post</span>
                <h4 className="font-bold mt-2 group-hover:underline line-clamp-1 italic">Why Mental Stimulation is Key for Indoor Cats</h4>
              </div>
              <div className="w-1/2 pl-4 text-right group cursor-pointer">
                <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold group-hover:text-orange-500 transition-colors">Next Post</span>
                <h4 className="font-bold mt-2 group-hover:underline line-clamp-1 italic">Essential Vaccinations for Your New Puppy</h4>
              </div>
            </div>
          </main>

          {/* Sidebar Area */}
          <aside className="lg:w-1/3 space-y-12">
            {/* About Author Card */}
            <Card className="overflow-hidden border-none bg-orange-50 shadow-none rounded-3xl">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-4">About the Author</h3>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-orange-200 flex items-center justify-center text-orange-700 text-2xl font-bold flex-shrink-0">
                    {(blog.authorName || "P")[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{blog.authorName || "Paw Sattva Team"}</h4>
                    <p className="text-sm text-muted-foreground">Pet Care Expert</p>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                  Sharing expert insights and heartfelt advice for a happier, healthier life with your pets.
                </p>
                <Button className="w-full bg-orange-500 hover:bg-orange-600 rounded-xl shadow-lg shadow-orange-200">
                  Follow {blog.authorName?.split(' ')[0] || "Author"}
                </Button>
              </CardContent>
            </Card>

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <div>
                <h3 className="text-2xl font-bold mb-8 flex items-center">
                  <span className="w-8 h-1 bg-orange-500 mr-4 rounded-full" />
                  Related Articles
                </h3>
                <div className="space-y-6">
                  {relatedPosts.map((post: Blog, idx: number) => (
                    <Link key={idx} href={`/blog/${post.slug}`} className="group block">
                      <div className="flex gap-4 items-start">
                        <div className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-transparent group-hover:border-orange-500 transition-all">
                          <Image
                            src={post.image || defaultImage}
                            alt={post.title}
                            fill
                            className="object-cover"
                            sizes="96px"
                          />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold leading-tight group-hover:text-orange-600 transition-colors">
                            {post.title}
                          </h4>
                          <p className="text-xs text-muted-foreground flex items-center mt-1">
                            <Calendar className="w-3 h-3 mr-1" />
                            {post.date}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Newsletter Card */}
            <Card className="border-2 border-orange-100 rounded-3xl shadow-xl shadow-black/5 overflow-hidden">
              <div className="h-2 bg-orange-500" />
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-2">Join our Newsletter</h3>
                <p className="text-sm text-muted-foreground mb-6">Get the latest pet care tips and guides delivered to your inbox.</p>
                <SubscriptionForm />
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
