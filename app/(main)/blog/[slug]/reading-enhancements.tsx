'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

type TocItem = { id: string; text: string; level: number };

function ReadingEnhancements({ toc }: { toc: TocItem[]; title?: string }) {
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const article = document.querySelector<HTMLElement>('[data-reading-article]');
      const scrollTop = window.scrollY;
      setShowTop(scrollTop > 600);

      if (!article) {
        setProgress(0);
        return;
      }

      const rect = article.getBoundingClientRect();
      const articleTop = scrollTop + rect.top;
      const articleHeight = article.offsetHeight;
      const viewport = window.innerHeight;
      const travelled = scrollTop - articleTop;
      const available = Math.max(1, articleHeight - viewport * 0.35);
      const pct = Math.min(100, Math.max(0, (travelled / available) * 100));
      setProgress(pct);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

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
      { rootMargin: '-120px 0px -60% 0px', threshold: [0, 1] }
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [toc]);

  return (
    <>
      <div className="sticky top-0 z-20 border-b border-orange-100/80 bg-white/88 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/88 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
            Reading progress
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-orange-100 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-500 transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="w-10 text-right text-xs font-black tabular-nums text-orange-600">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        className={`fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 text-white shadow-xl shadow-orange-500/30 transition-all duration-300 hover:bg-orange-600 ${
          showTop ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </>
  );
}

export default ReadingEnhancements;
