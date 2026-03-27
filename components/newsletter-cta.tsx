"use client";

import React, { useState } from 'react';
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { addSubscription } from "@/firebase/firestore";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function NewsletterCTA() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      // We'll store partial details since this is the quick subscribe version
      await addSubscription({
        email,
        name: '',
        phone: '',
        petBreed: ''
      });
      toast.success("Welcome to the pack!");
      setEmail('');
    } catch (error) {
      console.error("Newsletter error:", error);
      toast.error("Failed to subscribe. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="container mx-auto px-4 py-24">
      <div className="relative rounded-[3rem] overflow-hidden bg-primary px-8 py-20 md:p-24 text-center md:text-left shadow-2xl shadow-primary/20">
        {/* Background Texture/Image Overlay */}
        <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none mix-blend-overlay">
          <Image
            src="https://images.unsplash.com/photo-1548191265-cc70d3d45ba1?q=80&w=2070&auto=format&fit=crop"
            alt="Texture"
            fill
            className="object-cover"
            sizes="33vw"
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
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-lg">
              <div className="flex-grow">
                <input
                  type="email"
                  required
                  placeholder="your-awesome@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-14 rounded-2xl bg-white/20 border-2 border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-4 focus:ring-white/10 px-6 text-lg font-medium transition-all"
                />
              </div>
              <Button 
                type="submit" 
                disabled={loading}
                className="h-14 rounded-2xl bg-white text-primary hover:bg-white/90 font-bold px-10 text-lg shadow-xl shadow-black/10 transition-all hover:scale-105 active:scale-95"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "I'm In!"}
              </Button>
            </form>
          </div>
          <div className="lg:col-span-2 hidden lg:flex justify-end">
            <div className="relative w-80 h-80 bg-white/10 rounded-[3rem] backdrop-blur-xl border border-white/20 p-4">
              <div className="w-full h-full rounded-[2.5rem] overflow-hidden relative">
                <Image
                  src="https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=800&auto=format&fit=crop"
                  alt="Pack dog"
                  fill
                  className="object-cover"
                  sizes="320px"
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
  );
}
