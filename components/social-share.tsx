"use client";

import React, { useState } from 'react';
import {
  X as TwitterIcon,
  Link as LinkIcon,
  Check,
  Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface SocialShareProps {
  title: string;
  url?: string;
}

export function SocialShare({ title, url }: SocialShareProps) {
  const [copied, setCopied] = useState(false);

  // Get current URL if not provided
  const shareUrl = typeof window !== 'undefined' ? (url || window.location.href) : '';
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = [
    {
      name: 'Twitter',
      icon: <TwitterIcon className="w-4 h-4 text-[#1DA1F2]" />,
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    },
    {
      name: 'WhatsApp',
      icon: (
        <svg className="w-4 h-4 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .004 5.408.001 12.045c0 2.121.554 4.191 1.606 6.023L0 24l6.113-1.603a11.846 11.846 0 005.932 1.577h.005c6.631 0 12.046-5.408 12.048-12.047a11.8 11.8 0 00-3.486-8.451" />
        </svg>
      ),
      href: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
    }
  ];

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full flex items-center gap-2 hover:bg-orange-50 hover:text-orange-600 transition-all border-orange-100">
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 p-2 rounded-2xl border-orange-100 shadow-xl">
        <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
          Share Article
        </div>
        {shareLinks.map((link) => (
          <DropdownMenuItem
            key={link.name}
            className="flex items-center gap-3 cursor-pointer rounded-xl focus:bg-orange-50/50 py-2.5"
            asChild
          >
            <a href={link.href} target="_blank" rel="noopener noreferrer">
              <span className="p-1.5 rounded-lg bg-muted/20">{link.icon}</span>
              <span className="font-medium text-sm">{link.name}</span>
            </a>
          </DropdownMenuItem>
        ))}
        <div className="h-px bg-orange-100 my-1 mx-2" />
        <DropdownMenuItem
          className="flex items-center gap-3 cursor-pointer rounded-xl focus:bg-orange-50/50 py-2.5"
          onClick={copyToClipboard}
        >
          <span className="p-1.5 rounded-lg bg-muted/20">
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <LinkIcon className="w-4 h-4 text-zinc-500" />}
          </span>
          <span className="font-medium text-sm">{copied ? 'Copied!' : 'Copy Link'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
