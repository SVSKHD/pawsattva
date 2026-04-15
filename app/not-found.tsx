import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import Paw from "./pawsattva.png";
import { Home, Search } from "lucide-react";

export const metadata: Metadata = {
  title: "404 – Page Not Found | Paw Sattva",
  description:
    "Oops! This page has gone for a walk. Let's find our way back to Paw Sattva.",
};

const petImages = [
  {
    src: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=800&auto=format&fit=crop",
    alt: "Golden retriever puppy",
    rotate: "-rotate-6",
    scale: "scale-95",
    delay: "delay-100",
  },
  {
    src: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=800&auto=format&fit=crop",
    alt: "Cute tabby cat",
    rotate: "rotate-3",
    scale: "scale-100",
    delay: "delay-200",
  },
  {
    src: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?q=80&w=800&auto=format&fit=crop",
    alt: "Adorable dog",
    rotate: "-rotate-3",
    scale: "scale-95",
    delay: "delay-300",
  },
  {
    src: "https://images.unsplash.com/photo-1573435567032-ff5982925350?q=80&w=800&auto=format&fit=crop",
    alt: "Fluffy cat",
    rotate: "rotate-6",
    scale: "scale-100",
    delay: "delay-100",
  },
  {
    src: "https://images.unsplash.com/photo-1548191265-cc70d3d45ba1?q=80&w=800&auto=format&fit=crop",
    alt: "Playful dog",
    rotate: "-rotate-2",
    scale: "scale-95",
    delay: "delay-200",
  },
  {
    src: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=800&auto=format&fit=crop",
    alt: "Happy cat being groomed",
    rotate: "rotate-4",
    scale: "scale-100",
    delay: "delay-300",
  },
];

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-background"
      style={{ fontFamily: "var(--font-montserrat, sans-serif)" }}
    >
      {/* Animated blurred background orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(251,146,60,0.18) 0%, transparent 70%)",
          filter: "blur(60px)",
          animation: "pulse 6s ease-in-out infinite",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(234,88,12,0.14) 0%, transparent 70%)",
          filter: "blur(80px)",
          animation: "pulse 8s ease-in-out infinite 2s",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(251,146,60,0.07) 0%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-12 px-4 py-16 max-w-6xl mx-auto w-full">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 group transition-transform hover:scale-105 duration-300"
          aria-label="Go to Paw Sattva home"
        >
          <div className="relative w-12 h-12">
            <Image
              src={Paw}
              alt="Paw Sattva logo"
              fill
              className="object-contain"
              priority
              sizes="48px"
            />
          </div>
          <span
            style={{
              fontFamily: "var(--font-pacifico, cursive)",
              background: "linear-gradient(90deg, #ea580c, #fb923c)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
            className="text-2xl leading-none p-1"
          >
            Paw Sattva
          </span>
        </Link>

        {/* Pet image collage */}
        <div
          className="relative w-full"
          style={{ minHeight: "260px" }}
          aria-label="Collage of happy dogs and cats"
        >
          {/* Desktop: 6 staggered cards in a row */}
          <div className="hidden md:flex items-end justify-center gap-4 pb-4">
            {petImages.map((pet, i) => (
              <div
                key={i}
                className={`
                  relative overflow-hidden rounded-3xl border-4 border-white shadow-2xl
                  ${pet.rotate} ${pet.scale} ${pet.delay}
                  transition-all duration-700 ease-out
                  hover:rotate-0 hover:scale-110 hover:z-20 hover:shadow-[0_20px_60px_rgba(234,88,12,0.25)]
                  cursor-default
                `}
                style={{
                  width: "150px",
                  height: i % 2 === 0 ? "190px" : "220px",
                  flexShrink: 0,
                  animation: `float-${i % 3} ${4 + i * 0.5}s ease-in-out infinite`,
                }}
              >
                <Image
                  src={pet.src}
                  alt={pet.alt}
                  fill
                  className="object-cover"
                  sizes="150px"
                />
                {/* Soft inner glow overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-orange-500/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
              </div>
            ))}
          </div>

          {/* Mobile: 2-row staggered grid */}
          <div className="md:hidden grid grid-cols-3 gap-3 px-2">
            {petImages.map((pet, i) => (
              <div
                key={i}
                className={`
                  relative overflow-hidden rounded-2xl border-[3px] border-white shadow-xl
                  ${pet.rotate} ${pet.scale}
                  transition-all duration-500 hover:rotate-0 hover:scale-105
                `}
                style={{
                  height: i % 2 === 0 ? "110px" : "130px",
                }}
              >
                <Image
                  src={pet.src}
                  alt={pet.alt}
                  fill
                  className="object-cover"
                  sizes="33vw"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Main content card */}
        <div
          className="text-center px-6 py-12 rounded-[2.5rem] max-w-2xl w-full relative"
          style={{
            background: "rgba(255,255,255,0.55)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.4)",
            boxShadow:
              "0 8px 40px -12px rgba(234,88,12,0.15), 0 4px 6px -1px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.7)",
          }}
        >
          {/* Paw print emoji decoration */}
          <div className="text-5xl mb-4 select-none" aria-hidden="true">
            🐾
          </div>

          {/* 404 number */}
          <div
            className="text-[8rem] md:text-[10rem] font-black leading-none mb-4 select-none"
            style={{
              background:
                "linear-gradient(135deg, #ea580c 0%, #fb923c 50%, #fdba74 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "none",
              letterSpacing: "-0.04em",
            }}
            aria-hidden="true"
          >
            404
          </div>

          {/* Headline */}
          <h1 className="text-2xl md:text-3xl font-extrabold mb-3 tracking-tight text-foreground">
            Oops! This page is not available here.
          </h1>

          {/* Subtext */}
          <p className="text-base md:text-lg text-muted-foreground font-medium mb-2 max-w-md mx-auto leading-relaxed">
            Sorry, this page has gone for a walk with our furry friends. 🐶🐱
          </p>
          <p className="text-sm text-muted-foreground/70 mb-10 max-w-sm mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or may have been
            moved. Let&apos;s get you back on track!
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              id="not-found-home-btn"
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95"
              style={{
                background:
                  "linear-gradient(135deg, #ea580c 0%, #fb923c 100%)",
                boxShadow: "0 8px 24px -4px rgba(234,88,12,0.4)",
              }}
            >
              <Home className="w-4 h-4" />
              Back to Home
            </Link>
            <Link
              href="/blog"
              id="not-found-blog-btn"
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold transition-all duration-300 hover:scale-105 active:scale-95 border-2"
              style={{
                background: "rgba(255,255,255,0.6)",
                borderColor: "rgba(234,88,12,0.2)",
                color: "#ea580c",
              }}
            >
              <Search className="w-4 h-4" />
              Browse Blog
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground/50 text-center">
          © {new Date().getFullYear()} Paw Sattva · All rights reserved
        </p>
      </div>

      {/* Floating animation keyframes injected inline via a style tag */}
      <style>{`
        @keyframes float-0 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float-1 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes float-2 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
        }
      `}</style>
    </div>
  );
}
