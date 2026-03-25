"use client";

import React from 'react';
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Heart,
  ShieldCheck,
  Zap,
  ChevronRight,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Paw from "../pawsattva.png";

// Latest Blogs for the snapshot section
const latestBlogsSnapshot = [
  {
    title: "Understanding Pet Nutrition: A Complete Guide",
    category: "Nutrition",
    date: "Mar 20, 2026",
    readTime: "8 min read",
    image: "https://images.unsplash.com/photo-1548191265-cc70d3d45ba1?q=80&w=800&auto=format&fit=crop",
    slug: "understanding-pet-nutrition",
  },
  {
    title: "5 Tips for Outdoor Activities with Dogs",
    category: "Training",
    date: "Mar 15, 2026",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1551717743-499438096569?q=80&w=800&auto=format&fit=crop",
    slug: "outdoor-activities-dogs",
  },
  {
    title: "Common Household Hazards for Cats",
    category: "Health",
    date: "Mar 12, 2026",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=800&auto=format&fit=crop",
    slug: "cat-hazards",
  }
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* ── HERO SECTION ───────────────────────────────────────────────────────── */}
      <section className="relative w-full py-20 lg:py-32 overflow-hidden">
        {/* Animated Background Spheres (Liquid Aesthetic) */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-200/40 rounded-full blur-[120px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] animate-pulse pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
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
                <Link href="/login">
                  <Button size="lg" variant="outline" className="h-14 px-8 rounded-2xl border-2 font-bold text-lg transition-all hover:bg-muted/50">
                    Join the Pack
                  </Button>
                </Link>
              </div>
              <div className="pt-8 flex items-center justify-center lg:justify-start gap-8 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                      <Image src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" width={40} height={40} className="rounded-full" />
                    </div>
                  ))}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1 text-orange-500">
                    {"★★★★★".split("").map((s, i) => <span key={i}>{s}</span>)}
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Loved by 10k+ Pet Families</p>
                </div>
              </div>
            </div>

            {/* Hero Image / Visual */}
            <div className="relative animate-in fade-in zoom-in-95 duration-1000">
              <div className="relative aspect-square lg:aspect-auto lg:h-[600px] w-full rounded-[3rem] overflow-hidden shadow-2xl shadow-primary/10">
                <Image
                  src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=2500&auto=format&fit=crop"
                  alt="Happy Dog"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-transparent" />

                {/* Floating Glass Cards */}
                <div className="absolute bottom-8 left-8 right-8">
                  <div className="liquid-card p-6 flex items-center gap-4 transition-transform hover:translate-y-[-4px] duration-300">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center text-white shrink-0 shadow-lg">
                      <Heart className="w-6 h-6 fill-current" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg leading-tight">Expert Veterinary Advice</h4>
                      <p className="text-sm text-foreground/70 font-medium">Verified by nutritionists for your peace of mind.</p>
                    </div>
                  </div>
                </div>

                <div className="absolute top-8 right-8 hidden md:block">
                  <div className="liquid-card p-4 flex items-center gap-3 backdrop-blur-2xl">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-bold uppercase tracking-wider">Premium Nutrition</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CORE FEATURES ──────────────────────────────────────────────────────── */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">The <span className="text-primary italic">Sattva</span> Standard</h2>
            <p className="text-lg text-muted-foreground font-medium italic">We don't just provide tips; we provide a philosophy for pet longevity and happiness.</p>
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
                title: "Premium Community",
                desc: "Join thousands of other pet owners sharing experiences and growing together.",
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
            {latestBlogsSnapshot.map((blog, idx) => (
              <Link key={idx} href={`/blog/${blog.slug}`} className="group block">
                <div className="liquid-card h-full flex flex-col overflow-hidden transition-all duration-500 group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] group-hover:-translate-y-1">
                  <div className="relative h-56 w-full overflow-hidden">
                    <Image
                      src={blog.image}
                      alt={blog.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-white/90 dark:bg-black/80 backdrop-blur-md text-foreground border-none px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg ring-1 ring-black/5">
                        {blog.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-8 flex flex-col flex-grow">
                    <div className="flex items-center gap-4 text-[10px] font-bold text-primary/70 uppercase tracking-widest mb-4">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-orange-500" />
                        {blog.date}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-zinc-300" />
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {blog.readTime}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold mb-6 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                      {blog.title}
                    </h3>
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
        </div>
      </section>

      {/* ── CTA / COMMUNITY ──────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-24">
        <div className="relative rounded-[3rem] overflow-hidden bg-primary px-8 py-20 md:p-24 text-center md:text-left shadow-2xl shadow-primary/20">
          {/* Background Texture/Image Overlay */}
          <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none mix-blend-overlay">
            <Image
              src="https://images.unsplash.com/photo-1548191265-cc70d3d45ba1?q=80&w=2070&auto=format&fit=crop"
              alt="Texture"
              fill
              className="object-cover"
            />
          </div>

          <div className="relative z-10 grid lg:grid-cols-5 gap-16 items-center">
            <div className="lg:col-span-3 space-y-8">
              <h2 className="text-4xl md:text-6xl font-extrabold text-white leading-tight">
                Join the most <span className="italic underline underline-offset-8 decoration-white/30">vibrant</span> pet pack.
              </h2>
              <p className="text-xl text-white/80 font-medium max-w-xl">
                Get weekly pet care tips, exclusive community event invites, and special product early access.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 max-w-lg">
                <div className="flex-grow">
                  <input
                    type="email"
                    placeholder="your-awesome@email.com"
                    className="w-full h-14 rounded-2xl bg-white/20 border-2 border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-4 focus:ring-white/10 px-6 text-lg font-medium transition-all"
                  />
                </div>
                <Button className="h-14 rounded-2xl bg-white text-primary hover:bg-white/90 font-bold px-10 text-lg shadow-xl shadow-black/10 transition-all hover:scale-105 active:scale-95">
                  I'm In!
                </Button>
              </div>
            </div>
            <div className="lg:col-span-2 hidden lg:flex justify-end">
              <div className="relative w-80 h-80 bg-white/10 rounded-[3rem] backdrop-blur-xl border border-white/20 p-4">
                <div className="w-full h-full rounded-[2.5rem] overflow-hidden relative">
                  <Image
                    src="https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=800&auto=format&fit=crop"
                    alt="Pack dog"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur shadow-xl px-4 py-2 rounded-xl">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Member Spotlight</p>
                    <p className="text-sm font-bold text-black">Buddy & Sarah</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-center mb-20 tracking-tight">Whisker-Approved <span className="text-primary italic">Stories</span></h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
            {[
              {
                name: "Marcus Thorne",
                role: "Labrador Parent",
                quote: "Paw Sattva has completely changed how I feed Duke. His coat is shinier and his energy levels are through the roof!",
                avatar: "https://i.pravatar.cc/100?img=12"
              },
              {
                name: "Elena Rodriguez",
                role: "Feline Enthusiast",
                quote: "The grooming guides are so detailed. My cats actually enjoy brushing time now, which is a miracle!",
                avatar: "https://i.pravatar.cc/100?img=26"
              },
              {
                name: "Sarah Jenkins",
                role: "Puppy Parent",
                quote: "I was overwhelmed as a first-time owner, but the Sattva training principles gave me so much confidence.",
                avatar: "https://i.pravatar.cc/100?img=33"
              }
            ].map((t, i) => (
              <div key={i} className="liquid-card p-10 flex flex-col h-full bg-white/50 backdrop-blur-3xl border-white/40">
                <div className="flex items-center gap-4 mb-8">
                  <Image src={t.avatar} alt={t.name} width={56} height={56} className="rounded-2xl border-2 border-primary/20" />
                  <div>
                    <h4 className="font-bold text-lg leading-none mb-1">{t.name}</h4>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t.role}</p>
                  </div>
                </div>
                <p className="text-lg font-medium italic text-foreground/80 leading-relaxed group-hover:text-foreground transition-colors">
                  "{t.quote}"
                </p>
                <div className="mt-8 flex gap-1 text-orange-400">
                  {"★★★★★".split("").map((s, i) => <span key={i} className="text-xl">★</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
