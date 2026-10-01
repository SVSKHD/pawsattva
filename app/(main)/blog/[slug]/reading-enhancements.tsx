'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { getBlogScroller, getScrollTop, getScrollViewport, onBlogScroll, scrollToTop } from './blog-scroller';

type TocItem = { id: string; text: string; level: number };

function ReadingEnhancements({ toc, readTime }: { toc: TocItem[]; readTime: number }) {
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Progress UI is only shown while the reader is actively scrolling
  const [scrolling, setScrolling] = useState(false);

  useEffect(() => {
    let frame = 0;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;

    const update = () => {
      frame = 0;
      const article = document.querySelector<HTMLElement>('[data-reading-content]');
      setShowTop(getScrollTop() > 600);

      if (!article) {
        setProgress(0);
        return;
      }

      // Measured against the visible reading area (right column on desktop, viewport on mobile)
      const rect = article.getBoundingClientRect();
      const view = getScrollViewport();
      const travelled = view.top + view.height * 0.3 - rect.top;
      const available = Math.max(1, rect.height - view.height * 0.4);
      setProgress(Math.min(100, Math.max(0, (travelled / available) * 100)));
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    const onScroll = () => {
      requestUpdate();
      setScrolling(true);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setScrolling(false), 1200);
    };

    update();
    const offScroll = onBlogScroll(onScroll);
    window.addEventListener('resize', requestUpdate);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      clearTimeout(idleTimer);
      offScroll();
      window.removeEventListener('resize', requestUpdate);
    };
  }, []);

  // Desktop: the window is locked, so route wheel and keyboard scrolling to the right column
  useEffect(() => {
    const left = document.querySelector<HTMLElement>('.blog-left');

    const onWheel = (event: WheelEvent) => {
      const scroller = getBlogScroller();
      if (!scroller || !left) return;
      // Let scrollable parts of the left panel (contents list, open comments) scroll themselves
      for (let el = event.target as HTMLElement | null; el && el !== left; el = el.parentElement) {
        const overflowY = window.getComputedStyle(el).overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) return;
      }
      const lineHeight = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? scroller.clientHeight : 1;
      scroller.scrollBy({ top: event.deltaY * lineHeight });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const scroller = getBlogScroller();
      const active = document.activeElement;
      if (!scroller || (active && active !== document.body && active !== document.documentElement)) return;
      const page = scroller.clientHeight * 0.85;
      const amount: Record<string, number> = {
        ArrowDown: 64, ArrowUp: -64, PageDown: page, PageUp: -page,
        ' ': event.shiftKey ? -page : page,
      };
      if (event.key === 'Home') scroller.scrollTo({ top: 0, behavior: 'smooth' });
      else if (event.key === 'End') scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
      else if (event.key in amount) scroller.scrollBy({ top: amount[event.key], behavior: 'smooth' });
      else return;
      event.preventDefault();
    };

    left?.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      left?.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  // Highlight the TOC entry for the section currently being read
  useEffect(() => {
    if (!toc.length) return;
    const links = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('[data-toc-link]')
    );
    const setActive = (id: string) => {
      links.forEach((a) => {
        a.dataset.active = a.dataset.tocLink === id ? 'true' : 'false';
      });
      setActiveId(id);
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

  const pct = Math.round(progress);
  const minutesLeft = Math.ceil(readTime * (1 - progress / 100));
  const activeSection = toc.find((t) => t.id === activeId)?.text;

  return (
    <>
      {/* Desktop: progress card in the left panel, directly above the comments. It expands only while
          scrolling; the contents list above absorbs the height, so the comments row never moves. */}
      <div
        aria-hidden={!scrolling}
        className={`hidden shrink-0 transition-[grid-template-rows,opacity,margin] duration-300 ease-out motion-reduce:transition-none lg:grid ${
          scrolling ? 'mt-4 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Reading progress
              </span>
              <span className="text-2xl font-extrabold tabular-nums text-orange-600">{pct}%</span>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-orange-100 dark:bg-white/10"
              role="progressbar"
              aria-label="Reading progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
            >
              <div
                className="h-full origin-left rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-500"
                style={{ transform: `scaleX(${progress / 100})` }}
              />
            </div>
            <p className="mt-2.5 truncate text-xs text-muted-foreground">
              {pct >= 100
                ? 'Finished — thanks for reading! 🐾'
                : activeSection
                  ? <>Now reading: <span className="font-medium text-foreground">{activeSection}</span></>
                  : `${minutesLeft} min left`}
            </p>
          </div>
        </div>
      </div>

      {/* Mobile/tablet: thin bar pinned to the top of the screen */}
      <div
        className={`fixed inset-x-0 top-0 z-[60] h-1 bg-transparent transition-opacity duration-300 lg:hidden ${
          scrolling ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden
      >
        <div
          className="h-full origin-left bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-500"
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </div>

      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Back to top"
        className={`fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 text-white shadow-xl shadow-orange-500/30 transition-all duration-300 hover:bg-orange-600 md:bottom-8 md:right-8 ${
          showTop ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </>
  );
}

export default ReadingEnhancements;
