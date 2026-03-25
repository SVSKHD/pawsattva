import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Tag, ChevronLeft, Share2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SocialShare } from '@/components/social-share';

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Dummy data for now
  const blog = {
    title: "Understanding Pet Nutrition: A Complete Guide",
    subtitle: "Everything you need to know about feeding your furry friends for a long and healthy life.",
    author: "Dr. Sarah Mitchell",
    date: "March 20, 2026",
    category: "Nutrition",
    readTime: "8 min read",
    image: "https://images.unsplash.com/photo-1548191265-cc70d3d45ba1?q=80&w=2070&auto=format&fit=crop",
    content: `
      <p class="text-lg leading-relaxed mb-6">Proper nutrition is the cornerstone of your pet's health. Just like humans, pets require a balanced diet of proteins, fats, carbohydrates, vitamins, and minerals to thrive. However, their specific needs can vary significantly based on their species, age, weight, and activity level.</p>
      
      <h2 class="text-2xl font-bold mt-10 mb-4">The Fundamentals of Pet Food</h2>
      <p class="mb-4">Commercial pet foods are formulated to be complete and balanced. This means they contain every single nutrient your pet requires in the correct proportions. When choosing a food, look for the AAFCO (Association of American Feed Control Officials) statement on the label, which ensures the food meets basic nutritional standards.</p>
      
      <blockquote class="border-l-4 border-orange-500 pl-6 py-2 my-8 italic text-xl text-muted-foreground">
        "A healthy pet starts with a healthy gut. Quality ingredients aren't just a luxury; they're a necessity for longevity."
      </blockquote>

      <h2 class="text-2xl font-bold mt-10 mb-4">Age-Specific Requirements</h2>
      <p class="mb-4">Puppies and kittens have vastly different nutritional needs than senior pets. Young animals require more calories and specific nutrients like DHA for brain development and calcium for bone growth. Senior pets, on the other hand, may need fewer calories but higher quality protein to maintain muscle mass.</p>
      
      <ul class="list-disc pl-6 mb-6 space-y-2">
        <li><strong>Puppy/Kitten:</strong> High protein, high fat, DHA for development.</li>
        <li><strong>Adult:</strong> Balanced maintenance diet.</li>
        <li><strong>Senior:</strong> Lower calorie, highly digestible protein, joint supplements.</li>
      </ul>

      <h2 class="text-2xl font-bold mt-10 mb-4">Common Nutritional Myths</h2>
      <p class="mb-4">There's a lot of misinformation out there about pet diets. One common myth is that grain-free is always better. While some pets do have grain sensitivities, most thrive on a diet that includes wholesome grains like brown rice or barley, which provide essential fiber and energy.</p>
    `,
    tags: ["Health", "Nutrition", "Dogs", "Cats", "Guide"],
    relatedPosts: [
      {
        title: "5 Tips for Outdoor Activities with Dogs",
        slug: "outdoor-activities-dogs",
        image: "https://images.unsplash.com/photo-1551717743-499438096569?q=80&w=800&auto=format&fit=crop",
        date: "Mar 15, 2026"
      },
      {
        title: "Common Household Hazards for Cats",
        slug: "cat-hazards",
        image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=800&auto=format&fit=crop",
        date: "Mar 12, 2026"
      }
    ]
  };

  return (
    <div className="bg-background min-h-screen">
      {/* Hero Header Section */}
      <div className="relative w-full h-[50vh] min-h-[400px]">
        <Image
          src={blog.image}
          alt={blog.title}
          fill
          className="object-cover"
          priority
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
                {blog.category}
              </Badge>
              <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
                {blog.title}
              </h1>
              <div className="flex flex-wrap items-center text-white/90 gap-6">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold mr-3 border-2 border-white">
                    {blog.author[0]}
                  </div>
                  <span className="font-medium text-lg">{blog.author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>{blog.date}</span>
                </div>
                <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-white/40" />
                <span>{blog.readTime}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col lg:flex-row gap-16">
          {/* Main Content Area */}
          <main className="lg:w-2/3">
            <p className="text-xl font-medium text-muted-foreground mb-10 italic border-l-4 border-orange-200 pl-6 leading-relaxed">
              {blog.subtitle}
            </p>
            
            <div 
              className="prose prose-lg dark:prose-invert max-w-none text-foreground/80"
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />

            <Separator className="my-12" />

            {/* Tags & Interaction */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex flex-wrap gap-2">
                {blog.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="px-3 py-1 bg-muted hover:bg-orange-50 transition-colors">
                    <Tag className="w-3 h-3 mr-1.5" />
                    {tag}
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
                    SM
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">Dr. Sarah Mitchell</h4>
                    <p className="text-sm text-muted-foreground">Veterinary Nutritionist</p>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                  Dr. Sarah has over 15 years of experience in veterinary medicine, specializing in canine and feline nutrition. She is passionate about helping pet owners make informed choices.
                </p>
                <Button className="w-full bg-orange-500 hover:bg-orange-600 rounded-xl shadow-lg shadow-orange-200">
                  Follow Dr. Sarah
                </Button>
              </CardContent>
            </Card>

            {/* Related Posts */}
            <div>
              <h3 className="text-2xl font-bold mb-8 flex items-center">
                <span className="w-8 h-1 bg-orange-500 mr-4 rounded-full" />
                Related Articles
              </h3>
              <div className="space-y-6">
                {blog.relatedPosts.map((post, idx) => (
                  <Link key={idx} href={`/blog/${post.slug}`} className="group block">
                    <div className="flex gap-4 items-start">
                      <div className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-transparent group-hover:border-orange-500 transition-all">
                        <Image
                          src={post.image}
                          alt={post.title}
                          fill
                          className="object-cover"
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

            {/* Newsletter Card */}
            <Card className="border-2 border-orange-100 rounded-3xl shadow-xl shadow-black/5 overflow-hidden">
                <div className="h-2 bg-orange-500" />
                <CardContent className="p-8">
                    <h3 className="text-xl font-bold mb-2">Join our Newsletter</h3>
                    <p className="text-sm text-muted-foreground mb-6">Get the latest pet care tips and guides delivered to your inbox.</p>
                    <div className="space-y-3">
                        <input className="w-full px-4 py-3 rounded-xl border border-muted bg-muted/50 focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="Email address" />
                        <Button className="w-full rounded-xl bg-orange-500 hover:bg-orange-600">Subscribe</Button>
                    </div>
                </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
