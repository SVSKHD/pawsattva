"use client";

import React, { useEffect, useState } from 'react';
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FaInstagram } from "react-icons/fa";
import Paw from "../app/pawsattva.png";
import type { Category } from "@/firebase/firestore";
import { categoryHref } from "@/lib/category-slug";

const CATEGORY_CACHE_KEY = "pawsattva-footer-categories-v2";
const MAX_TOPICS = 6;

type FooterTopic = Pick<Category, "id" | "name">;

// Only real pages — no placeholder "#" links
const LINK_GROUPS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Explore",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/walks", label: "Walks & places" },
      { href: "/consultation", label: "Consultation" },
    ],
  },
  {
    title: "Tools",
    links: [
      { href: "/pet-feed", label: "Pet feed plan" },
      { href: "/logger", label: "Food logger" },
      { href: "/dashboard", label: "My dashboard" },
    ],
  },
];

const SOCIALS = [
  { icon: FaInstagram, href: "https://instagram.com/pawsattva", label: "Paw Sattva on Instagram" },
];

/** Published, top-level categories only — sub-categories and drafts don't belong in the footer */
const toTopics = (categories: Category[]): FooterTopic[] =>
  categories
    .filter((category) => !category.parentId && category.status !== "draft")
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ id, name }) => ({ id, name }));

export function Footer() {
  const [topics, setTopics] = useState<FooterTopic[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    try {
      const cached = window.sessionStorage.getItem(CATEGORY_CACHE_KEY);
      if (cached) {
        setTopics(JSON.parse(cached) as FooterTopic[]);
        return;
      }
    } catch {
      // Storage can be unavailable in private browsing; the footer still works.
    }

    const loadCategories = async () => {
      try {
        const { getCategories } = await import("@/firebase/firestore");
        const next = toTopics(await getCategories());
        if (cancelled) return;
        setTopics(next);
        try {
          window.sessionStorage.setItem(CATEGORY_CACHE_KEY, JSON.stringify(next));
        } catch {
          // Caching is a performance enhancement, not a requirement.
        }
      } catch (error) {
        console.error("Unable to load footer categories:", error);
        if (!cancelled) setTopics([]);
      }
    };

    const idleId = window.requestIdleCallback?.(
      () => void loadCategories(),
      { timeout: 3000 }
    );
    const timeoutId = idleId === undefined
      ? window.setTimeout(() => void loadCategories(), 1500)
      : undefined;

    return () => {
      cancelled = true;
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    // Extra bottom padding on mobile so the fixed bottom navigation never covers the last line
    <footer className="relative border-t border-border/60 bg-background px-4 pb-32 pt-16 md:pb-10">
      <div className="container mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          {/* Brand */}
          <div className="max-w-sm space-y-5">
            <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Paw Sattva home">
              <Image src={Paw} alt="" width={44} height={44} className="object-contain" />
              <span className="text-2xl text-primary font-[family-name:var(--font-pacifico)]">Paw Sattva</span>
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Empowering pet parents with Sattva — a state of balance, health and harmony for every furry family member.
            </p>
            <div className="flex gap-2">
              {SOCIALS.map(({ icon: Icon, href, label }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:border-orange-400 hover:text-orange-600"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns — Topics always reserves its space so the footer never shifts when it loads */}
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-[1fr_1fr_1.4fr]">
            {LINK_GROUPS.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-foreground">{group.title}</h4>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="transition-colors hover:text-orange-600">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

            <nav aria-label="Blog topics" className="col-span-2 sm:col-span-1">
              <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-foreground">Topics</h4>
              {topics === null ? (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-1" aria-hidden>
                  {Array.from({ length: 4 }, (_, i) => (
                    <li key={i} className="h-4 w-24 animate-pulse rounded bg-muted" />
                  ))}
                </ul>
              ) : (
                <ul className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-muted-foreground sm:grid-cols-1">
                  {topics.slice(0, MAX_TOPICS).map((topic) => (
                    <li key={topic.id}>
                      <Link href={categoryHref(topic.name)} className="transition-colors hover:text-orange-600">
                        {topic.name}
                      </Link>
                    </li>
                  ))}
                  <li className="col-span-2 sm:col-span-1">
                    <Link href="/blog" className="inline-flex items-center gap-1 font-semibold text-orange-600 hover:underline">
                      {topics.length > MAX_TOPICS ? `All ${topics.length} topics` : "All articles"}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </li>
                </ul>
              )}
            </nav>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Paw Sattva. All rights reserved.</p>
          <p>Made with 🐾 for wonderful pets</p>
        </div>
      </div>
    </footer>
  );
}
