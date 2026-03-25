"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, Calendar, User, Clock, ChevronRight, ArrowUpRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Dummy Categories
const categories = [
  { id: 'all', name: 'All Topics' },
  { id: 'nutrition', name: 'Nutrition' },
  { id: 'health', name: 'Health' },
  { id: 'training', name: 'Training' },
  { id: 'lifestyle', name: 'Lifestyle' },
];

// Dummy Blogs
const dummyBlogs = [
  {
    id: '1',
    title: "Understanding Pet Nutrition: A Complete Guide",
    excerpt: "Everything you need to know about feeding your furry friends for a long and healthy life.",
    author: "Dr. Sarah Mitchell",
    date: "March 20, 2026",
    category: "Nutrition",
    readTime: "8 min read",
    image: "https://images.unsplash.com/photo-1548191265-cc70d3d45ba1?q=80&w=2070&auto=format&fit=crop",
    slug: "understanding-pet-nutrition",
    featured: true
  },
  {
    id: '2',
    title: "5 Tips for Outdoor Activities with Dogs",
    excerpt: "Stay active and safe while exploring the great outdoors with your canine companion.",
    author: "James Wilson",
    date: "Mar 15, 2026",
    category: "Training",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1551717743-499438096569?q=80&w=800&auto=format&fit=crop",
    slug: "outdoor-activities-dogs"
  },
  {
    id: '3',
    title: "Common Household Hazards for Cats",
    excerpt: "Identify and remove hidden dangers in your home to keep your cat safe and healthy.",
    author: "Dr. Emily Chen",
    date: "Mar 12, 2026",
    category: "Health",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=800&auto=format&fit=crop",
    slug: "cat-hazards"
  },
  {
    id: '4',
    title: "The Benefits of Regular Grooming",
    excerpt: "Why grooming is about more than just looking good for your pets' overall well-being.",
    author: "Sarah Brown",
    date: "Mar 10, 2026",
    category: "Lifestyle",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=800&auto=format&fit=crop",
    slug: "benefits-grooming"
  },
  {
    id: '5',
    title: "Puppy Socialization: The First 100 Days",
    excerpt: "How to introduce your new puppy to the world in a positive and constructive way.",
    author: "James Wilson",
    date: "Mar 8, 2026",
    category: "Training",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=800&auto=format&fit=crop",
    slug: "puppy-socialization"
  },
  {
    id: '6',
    title: "Dental Health for Senior Dogs",
    excerpt: "Maintain your aging dog's quality of life with proper oral care and hygiene.",
    author: "Dr. Sarah Mitchell",
    date: "Mar 5, 2026",
    category: "Health",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?q=80&w=800&auto=format&fit=crop",
    slug: "senior-dog-dental"
  }
];

import { getBlogs, Blog } from '@/firebase/firestore';

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const data = await getBlogs();
        setBlogs(data);
      } catch (error) {
        console.error("Error fetching blogs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  const filteredBlogs = blogs.filter(blog => {
    const matchesCategory = activeCategory === 'all' || blog.categoryId === activeCategory;
    const matchesSearch = blog.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         blog.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredPost = blogs.find(b => b.status === 'published');

  const calculateReadTime = (content: string) => {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute) + " min read";
  };

  const truncateExcerpt = (content: string, length: number = 160) => {
    const plainText = content.replace(/<[^>]*>/g, '');
    if (plainText.length <= length) return plainText;
    return plainText.substring(0, length).trim() + "...";
  };

  const defaultImage = "https://images.unsplash.com/photo-1548191265-cc70d3d45ba1?q=80&w=2070&auto=format&fit=crop";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen pb-20">
      {/* Search Header */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
         {/* Animated Background Spheres */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-200/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        
        <div className="container mx-auto px-4 relative z-10 text-center">
          <Badge className="mb-6 bg-orange-100 text-orange-600 hover:bg-orange-100 border-none px-4 py-1.5 rounded-full text-sm font-bold tracking-wide uppercase">
            Our Blog
          </Badge>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-8 tracking-tight">
            Insights for <span className="text-primary italic">Happy</span> Pets
          </h1>
          <div className="mx-auto max-w-2xl relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground">
              <Search className="w-5 h-5" />
            </div>
            <Input 
              type="text" 
              placeholder="Search articles, guides, tips..." 
              className="w-full pl-12 h-14 rounded-2xl border-none bg-white/50 dark:bg-black/20 backdrop-blur-xl shadow-xl shadow-black/5 text-lg focus-visible:ring-2 focus-visible:ring-primary/20 transition-all font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4">
        {/* Featured Post (if search/category is "all") */}
        {activeCategory === 'all' && !searchQuery && featuredPost && (
          <div className="mb-20">
            <Link href={`/blog/${featuredPost.slug}`} className="group block">
              <div className="relative h-[500px] rounded-[2.5rem] overflow-hidden shadow-2xl transition-transform duration-700 group-hover:scale-[1.01]">
                <Image
                  src={featuredPost.image || defaultImage}
                  alt={featuredPost.title}
                  fill
                  className="object-cover transition-transform duration-1000 group-hover:scale-105"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                   <div className="max-w-4xl space-y-4">
                      <Badge className="bg-orange-500 text-white border-none py-1 px-4 text-sm font-bold uppercase tracking-wider">
                        Featured Post
                      </Badge>
                      <h2 className="text-4xl md:text-6xl font-bold text-white leading-tight drop-shadow-lg group-hover:text-white/90 transition-colors">
                        {featuredPost.title}
                      </h2>
                      <p className="text-lg md:text-xl text-white/80 max-w-2xl line-clamp-2 font-medium">
                        {featuredPost.excerpt || truncateExcerpt(featuredPost.content)}
                      </p>
                      <div className="flex flex-wrap items-center text-white/90 gap-6 pt-4">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center border border-white/30 text-white font-bold text-xl">
                              {(featuredPost.authorName || "P")[0]}
                            </div>
                            <span className="font-semibold">{featuredPost.authorName || "Paw Sattva Team"}</span>
                         </div>
                         <div className="flex items-center gap-2 text-sm md:text-base">
                            <Calendar className="w-4 h-4" />
                            <span>{featuredPost.date}</span>
                         </div>
                         <div className="flex items-center gap-2 text-sm md:text-base">
                            <Clock className="w-4 h-4" />
                            <span>{calculateReadTime(featuredPost.content)}</span>
                         </div>
                      </div>
                   </div>
                   <div className="hidden md:flex absolute bottom-12 right-12 w-16 h-16 rounded-full bg-white flex items-center justify-center text-black transition-transform duration-500 group-hover:rotate-45 group-hover:scale-110">
                      <ArrowUpRight className="w-8 h-8" />
                   </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Categories / Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12 border-b border-muted pb-8 px-2">
           <div className="flex flex-wrap items-center gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 border-2 ${
                    activeCategory === cat.id 
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/30" 
                    : "bg-background text-muted-foreground border-transparent hover:border-muted hover:bg-muted/30"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
           </div>
           <div className="text-sm font-semibold text-muted-foreground flex items-center gap-2 bg-muted/20 px-4 py-2 rounded-full border border-muted/30">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              Showing {filteredBlogs.length} articles
           </div>
        </div>

        {/* Blog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
          {filteredBlogs.map((blog) => (
            <Link 
              key={blog.id} 
              href={`/blog/${blog.slug}`} 
              className="group block"
            >
              <div className="liquid-card h-full flex flex-col overflow-hidden transition-all duration-500 group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] group-hover:-translate-y-2">
                {/* Image Wrap */}
                <div className="relative h-64 w-full overflow-hidden">
                  <Image
                    src={blog.image || defaultImage}
                    alt={blog.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-white/80 dark:bg-black/80 backdrop-blur-md text-foreground border-none px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg">
                      {/* Map categoryId or show Generic */}
                      {blog.categoryId || "General"}
                    </Badge>
                  </div>
                  {/* Glass Overlay on Hover */}
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                      <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center text-primary scale-0 group-hover:scale-100 transition-transform duration-500 delay-100 shadow-xl">
                          <ChevronRight className="w-6 h-6" />
                      </div>
                  </div>
                </div>

                <div className="p-8 flex flex-col flex-grow">
                  <div className="flex items-center gap-4 text-xs font-bold text-primary/70 uppercase tracking-widest mb-4">
                    <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                       <Calendar className="w-3.5 h-3.5" />
                       {blog.date}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-orange-300" />
                    <span className="flex items-center gap-1.5">
                       <Clock className="w-3.5 h-3.5" />
                       {calculateReadTime(blog.content)}
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-4 line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                    {blog.title}
                  </h3>
                  
                  <p className="text-muted-foreground mb-8 line-clamp-3 text-sm leading-relaxed font-medium">
                    {blog.excerpt || truncateExcerpt(blog.content)}
                  </p>

                  <div className="mt-auto pt-6 border-t border-muted/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-700 dark:text-orange-300 font-bold text-xs ring-4 ring-orange-50/50 dark:ring-orange-950/20">
                        {(blog.authorName || "P")[0]}
                      </div>
                      <span className="text-xs font-bold text-foreground/80">{blog.authorName || "Paw Sattva Team"}</span>
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

        {/* Empty State */}
        {filteredBlogs.length === 0 && (
          <div className="py-40 text-center animate-in fade-in zoom-in duration-500">
            <div className="bg-muted/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground border-2 border-dashed border-muted">
              <Search className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold mb-2">No articles found</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              We couldn't find any articles matching your search query. Try different keywords or browse other categories.
            </p>
            <Button 
                variant="outline" 
                className="mt-8 rounded-full px-8"
                onClick={() => {setSearchQuery(''); setActiveCategory('all');}}
            >
                Clear Filters
            </Button>
          </div>
        )}

        {/* CTA Section */}
        <section className="mt-32 relative rounded-[3rem] overflow-hidden bg-primary p-12 md:p-20 text-center md:text-left">
           <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
              <Image 
                src="https://images.unsplash.com/photo-1548191265-cc70d3d45ba1?q=80&w=2070&auto=format&fit=crop"
                alt="Pet shadow"
                fill
                className="object-cover grayscale"
              />
           </div>
           <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
                  Join our pet-loving community
                </h2>
                <p className="text-white/80 text-lg font-medium mb-10 max-w-md">
                  Get exclusive pet care guides, product updates, and special offers delivered straight to your inbox.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                   <Input 
                    type="email" 
                    placeholder="your@email.com" 
                    className="h-14 rounded-2xl bg-white/20 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/30 text-lg px-6"
                   />
                   <Button className="h-14 rounded-2xl bg-white text-primary hover:bg-white/90 font-bold px-10 text-lg shadow-xl shadow-black/10 transition-all hover:scale-105 active:scale-95">
                     Subscribe
                   </Button>
                </div>
              </div>
              <div className="hidden md:flex justify-center">
                 <div className="relative w-80 h-80 rounded-full border-4 border-white/20 p-4">
                    <div className="w-full h-full rounded-full border-4 border-white/40 p-4 animate-[spin_30s_linear_infinite]">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full flex items-center justify-center text-primary shadow-lg text-lg">
                           🐾
                        </div>
                    </div>
                    <div className="absolute inset-4 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center">
                       <Image 
                        src="https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=800&auto=format&fit=crop"
                        alt="Join us"
                        width={200}
                        height={200}
                        className="rounded-full object-cover border-4 border-white shadow-2xl"
                       />
                    </div>
                 </div>
              </div>
           </div>
        </section>
      </div>
    </div>
  );
}
