'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

type TocItem = { id: string; text: string; level: number };

function ReadingEnhancements({ toc, title }: { toc: TocItem[]; title?: string }) {
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);

  // Scroll progress
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const scrollTop = h.scrollTop || document.body.scrollTop;
      const height = h.scrollHeight - h.clientHeight;
      const pct = height > 0 ? (scrollTop / height) * 100 : 0;
      setProgress(pct);
      setShowTop(scrollTop > 600);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Active TOC link via IntersectionObserver
  useEffect(() => {
    if (!toc.length) return;
    const links = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('[data-toc-link]')
    );
    const setActive = (id: string) => {
      links.forEach((a) => {
        const isActive = a.dataset.tocLink === id;
        a.classList.toggle('text-orange-600', isActive);
        a.classList.toggle('border-orange-500', isActive);
        a.classList.toggle('font-medium', isActive);
      });
    };

    const headings = toc
      .map((t) => document.getElementById(t.id))
      .filter((el): el is HTMLElement => !!el);

    if (!headings.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: [0, 1] }
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [toc]);

  return (
    <>
      {/* Top scroll progress bar */}
      <div className={`fixed left-3 right-3 top-3 z-50 mx-auto flex max-w-3xl items-center gap-3 rounded-full border border-white/30 bg-white/68 px-4 py-2 text-xs font-bold text-foreground shadow-xl shadow-black/10 backdrop-blur-2xl transition-all duration-300 dark:border-white/10 dark:bg-black/50 ${showTop ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'}`}>
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <span className="tabular-nums text-orange-600">{Math.round(progress)}%</span>
        <div className="absolute bottom-0 left-4 right-4 h-0.5 overflow-hidden rounded-full bg-orange-500/15">
          <div className="h-full bg-orange-500 transition-[width] duration-100" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div
        className="fixed top-0 left-0 right-0 h-1 z-50 bg-transparent pointer-events-none"
        aria-hidden
      >
        <div
          className="h-full bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Back to top */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        className={`fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-orange-500 text-white shadow-xl shadow-orange-500/30 flex items-center justify-center transition-all duration-300 hover:bg-orange-600 ${showTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </>
  );
}

export default ReadingEnhancements;
