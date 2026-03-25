"use client";

import React from 'react';
import Image from "next/image";
import Link from "next/link";
import { Zap } from "lucide-react";
import Paw from "../app/pawsattva.png";

export function Footer() {
  return (
    <footer className="bg-background px-4 py-20 border-t border-muted relative overflow-hidden">
      <div className="container mx-auto grid md:grid-cols-4 gap-16 relative z-10">
        <div className="md:col-span-1 space-y-6">
          <Link href="/" className="flex items-center gap-2 group">
            <Image src={Paw} alt="Logo" width={48} height={48} className="object-contain" />
            <span className="text-2xl font-[family-name:var(--font-pacifico)] text-primary">Paw Sattva</span>
          </Link>
          <p className="text-muted-foreground font-medium text-sm leading-relaxed">
            Empowering pet parents with Sattva—a state of balance, health, and harmony for every furry family member.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-lg mb-8 tracking-tight">Ecosystem</h4>
          <ul className="space-y-4 text-sm font-medium text-muted-foreground">
            <li><Link href="/blog" className="hover:text-primary transition-colors">Journal</Link></li>
            <li><Link href="#" className="hover:text-primary transition-colors">Nutrition Plans</Link></li>
            <li><Link href="#" className="hover:text-primary transition-colors">Expert Directory</Link></li>
            <li><Link href="#" className="hover:text-primary transition-colors">Community Forum</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-lg mb-8 tracking-tight">Support</h4>
          <ul className="space-y-4 text-sm font-medium text-muted-foreground">
            <li><Link href="#" className="hover:text-primary transition-colors">Help Center</Link></li>
            <li><Link href="#" className="hover:text-primary transition-colors">Safety Guides</Link></li>
            <li><Link href="#" className="hover:text-primary transition-colors">Terms of Care</Link></li>
            <li><Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-lg mb-8 tracking-tight">Connect</h4>
          <p className="text-sm font-medium text-muted-foreground mb-6">Stay updated on our journey to 1M happy tails.</p>
          <div className="flex gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:border-primary hover:text-primary transition-all">
                <Zap className="w-4 h-4" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="container mx-auto mt-20 pt-8 border-t border-muted-foreground/10 text-center text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
        &copy; 2026 Paw Sattva &bull; Made with 🐾 for wonderful pets
      </div>
    </footer>
  );
}
