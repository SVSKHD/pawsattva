"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addSubscription } from '@/firebase/firestore';
import { toast } from 'sonner';
import { Sparkles, Mail, User, Phone, Dog, Loader2 } from 'lucide-react';

export function SubscriptionForm() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    petBreed: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      toast.error("Please provide an email address");
      return;
    }

    setLoading(true);
    try {
      await addSubscription(formData);
      toast.success("Thank you for joining our community!");
      setFormData({ email: '', name: '', phone: '', petBreed: '' });
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <div className="relative group">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-orange-500 transition-colors" />
          <Input
            placeholder="Your Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="pl-10 h-10 md:h-12 bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 rounded-xl focus:ring-orange-500/30"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="relative group">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-orange-500 transition-colors" />
          <Input
            type="email"
            required
            placeholder="Email Address"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="pl-10 h-10 md:h-12 bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 rounded-xl focus:ring-orange-500/30"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative group">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-orange-500 transition-colors" />
          <Input
            placeholder="Phone Number"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="pl-10 h-10 md:h-12 bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 rounded-xl focus:ring-orange-500/30"
          />
        </div>
        <div className="relative group">
          <Dog className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-orange-500 transition-colors" />
          <Input
            placeholder="Pet Breed"
            value={formData.petBreed}
            onChange={(e) => setFormData({ ...formData, petBreed: e.target.value })}
            className="pl-10 h-10 md:h-12 bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 rounded-xl focus:ring-orange-500/30"
          />
        </div>
      </div>

      <Button 
        type="submit" 
        disabled={loading}
        className="w-full h-10 md:h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/20 font-bold transition-all hover:scale-[1.02] active:scale-95"
      >
        {loading ? (
             <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
            <>
              Join the Pack <Sparkles className="ml-2 w-4 h-4" />
            </>
        )}
      </Button>
      <p className="text-[10px] text-center text-muted-foreground mt-4 font-medium uppercase tracking-widest">
        By joining, you agree to receive pet care tips and updates.
      </p>
    </form>
  );
}
