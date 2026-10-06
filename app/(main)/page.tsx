import type { Metadata } from 'next';
import { getManagedPageMetadata } from '@/lib/page-seo';
import { ManagedJsonLd } from "@/components/managed-json-ld";
import Image from "next/image";
import { safeImageSrc } from "@/lib/image-hosts";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Heart,
  ShieldCheck,
  Zap,
  ChevronRight,
  Calendar,
  Clock,
  ArrowUpRight,
  Droplets,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NewsletterCTA } from "@/components/newsletter-cta";
import { HomePetCarousel } from "@/components/home-pet-carousel";
import { AuthDialogTrigger } from "@/components/auth-dialog-trigger";
import { Blog, getBlogs, getCategories } from "@/firebase/firestore";

const DEFAULT_BLOG_IMAGE = "https://images.unsplash.com/photo-1450778869180-41d0601e046e?q=80&w=1200&auto=format&fit=crop";

const plainText = (html: string) =>
  html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

const readTime = (content: string) =>
  `${Math.max(1, Math.ceil(plainText(content).split(" ").filter(Boolean).length / 200))} min read`;

const formatBlogDate = (value: unknown) => {
  if (!value) return "Recent";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const blogTimestamp = (blog: Blog) => {
  const rawDate = blog.updatedAt || blog.createdAt || blog.date;
  const date = rawDate && typeof rawDate === "object" && "toDate" in rawDate
    ? rawDate.toDate()
    : new Date(String(rawDate || ""));

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const primaryCategoryId = (blog: Blog) =>
  blog.categoryIds?.[0] || blog.categoryId;

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  return getManagedPageMetadata("home", {
    title: "Premium Pet Care & Nutrition",
    description:
      "Welcome to Paw Sattva — The ultimate haven for pet wellness, nutrition, and harmony.",
    keywords: ["pet community", "pet health", "holistic pet care"],
    pathname: "/",
  })
}

export default async function Home() {
  const [allBlogs, categories] = await Promise.all([
    getBlogs().catch((error) => {
      console.error("Unable to load homepage blogs:", error);
      return [];
    }),
    getCategories().catch((error) => {
      console.error("Unable to load homepage categories:", error);
      return [];
    }),
  ]);
  const latestBlogs = allBlogs
    .filter((blog) => blog.status === "published")
    .sort((a, b) => blogTimestamp(b) - blogTimestamp(a))
    .slice(0, 3);
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <ManagedJsonLd pageKey="home" />
      {/* ── HERO SECTION ───────────────────────────────────────────────────────── */}
      <section className="relative w-full py-20 lg:py-32 overflow-hidden">
        {/* Animated Background Spheres (Liquid Aesthetic) */}
        <div className="mobile-ambient-orb absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-200/40 rounded-full blur-[120px] animate-pulse pointer-events-none" />
        <div className="mobile-ambient-orb absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] animate-pulse pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10">
          {/* grid-cols-1 pins the mobile column to the screen width, so the carousel's
              changing captions can't widen (and therefore resize) the slides */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Hero Text */}
            <div className="mt-5 space-y-8 text-center lg:text-left animate-in fade-in slide-in-from-left-8 duration-700">
              <Badge className="bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border-none px-4 py-2 rounded-full text-sm font-bold tracking-wide uppercase inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                The Ultimate Haven for Pet Care
              </Badge>
              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
                Nurture Your Pet with <span className="text-primary italic">Deep</span> Care.
              </h1>
              <p className="text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
                At Paw Sattva, we believe every pet deserves a harmonious life. Discover expert guides, premium nutrition advice, and a community that loves your pets as much as you do.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <Link href="/blog">
                  <Button size="lg" className="h-14 px-8 rounded-2xl bg-primary hover:bg-orange-600 text-white font-bold text-lg shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                    Start Exploring Blog
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <AuthDialogTrigger
                  size="lg"
                  variant="outline"
                  signInTitle="Join the Paw Sattva pack"
                  signInDescription="Continue with Google and stay right here. Your Paw Sattva profile will be ready for pet plans, comments, and saved progress."
                  className="h-14 px-8 rounded-2xl border-2 font-bold text-lg transition-all hover:bg-muted/50"
                >
                  Join the Pack
                </AuthDialogTrigger>
              </div>
            </div>

            {/* Multi-pet hero carousel */}
            <HomePetCarousel />
          </div>
        </div>
      </section>

      {/* ── CORE FEATURES ──────────────────────────────────────────────────────── */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">The <span className="text-primary italic">Sattva</span> Standard</h2>
            <p className="text-lg text-muted-foreground font-medium italic">We don&apos;t just provide tips; we provide a philosophy for pet longevity and happiness.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                title: "Holistic Wellness",
                desc: "Focusing on both physical health and mental stimulation to keep your pet sharp and happy.",
                icon: ShieldCheck,
                color: "bg-blue-500",
                shadow: "shadow-blue-500/20"
              },
              {
                title: "Pawsitive Training",
                desc: "Modern, force-free methods that build a stronger bond between you and your companion.",
                icon: Zap,
                color: "bg-orange-500",
                shadow: "shadow-orange-500/20"
              },
              {
                title: "Pet Parent Community",
                desc: "Explore useful stories and guidance created for responsible pet parents.",
                icon: Heart,
                color: "bg-pink-500",
                shadow: "shadow-pink-500/20"
              }
            ].map((f, i) => (
              <div key={i} className="liquid-card p-10 flex flex-col items-center text-center group transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 cursor-default">
                <div className={`w-16 h-16 rounded-2xl ${f.color} ${f.shadow} flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform duration-500`}>
                  <f.icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4">{f.title}</h3>
                <p className="text-muted-foreground font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PET-FRIENDLY HOME WATER CARE ─────────────────────────────────────── */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-[2.25rem] border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-emerald-50 p-8 shadow-sm md:p-10">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-200/30 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
              <div>
                <Badge className="border-none bg-cyan-100 px-3 py-1 text-cyan-700">
                  <Droplets className="mr-1.5 h-3.5 w-3.5" />
                  Pet-friendly home water care
                </Badge>
                <h2 className="mt-5 text-3xl font-extrabold tracking-tight md:text-4xl">
                  Hard water at home can affect more than taps and tiles.
                </h2>
                <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-muted-foreground">
                  For pet households managing hard water in bathing, grooming, laundry and everyday cleaning,
                  explore household water-softening solutions from Aquakart. For your pet&apos;s drinking water,
                  follow your veterinarian&apos;s advice and your local water-quality guidance.
                </p>
              </div>
              <div className="flex lg:justify-end">
                <a
                  href="https://aquakart.co.in/category/Softeners"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-cyan-700"
                >
                  Explore water softeners
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LATEST FROM BLOG ─────────────────────────────────────────────────── */}
      <section className="py-24 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">From the Journal</h2>
              <p className="text-lg text-muted-foreground font-medium">Stay updated with the latest in pet care, nutrition, and lifestyle guides.</p>
            </div>
            <Link href="/blog">
              <Button variant="link" className="text-primary font-bold text-lg group p-0">
                View All Articles
                <ChevronRight className="ml-1 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {latestBlogs.map((blog) => (
              <Link key={blog.id} href={`/blog/${blog.slug}`} className="group block">
                <div className="liquid-card h-full flex flex-col overflow-hidden transition-all duration-500 group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] group-hover:-translate-y-1">
                  <div className="relative h-56 w-full overflow-hidden">
                    <Image
                      src={safeImageSrc(blog.image, DEFAULT_BLOG_IMAGE)}
                      alt={blog.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-white/90 dark:bg-black/80 backdrop-blur-md text-foreground border-none px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg ring-1 ring-black/5">
                        {categoryNames.get(primaryCategoryId(blog)) || "Pet Care"}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-8 flex flex-col flex-grow">
                    <div className="flex items-center gap-4 text-[10px] font-bold text-primary/70 uppercase tracking-widest mb-4">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-orange-500" />
                        {formatBlogDate(blog.date)}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-zinc-300" />
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {readTime(blog.content)}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold mb-3 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                      {blog.title}
                    </h3>
                    <p className="mb-6 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      {blog.excerpt || plainText(blog.content).slice(0, 150)}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-6 border-t border-muted/50">
                      <span className="text-xs font-bold text-foreground/60 group-hover:text-primary transition-colors flex items-center gap-1">
                        Read Journal <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {latestBlogs.length === 0 && (
            <div className="rounded-[2rem] border border-dashed border-orange-200 bg-orange-50/50 px-6 py-12 text-center dark:border-orange-900/40 dark:bg-orange-950/10">
              <h3 className="text-xl font-bold">Original stories are coming soon</h3>
              <p className="mt-2 text-sm text-muted-foreground">Published articles from the Paw Sattva admin will appear here automatically.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── CTA / COMMUNITY ──────────────────────────────────────────────────── */}
      <NewsletterCTA />


    </div>
  );
}
