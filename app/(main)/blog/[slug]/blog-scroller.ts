// On desktop the blog post scrolls inside its right column ([data-blog-scroller]);
// on mobile that element is `display: contents` and the window scrolls instead.

export function getBlogScroller(): HTMLElement | null {
  const el = document.querySelector<HTMLElement>("[data-blog-scroller]");
  if (!el) return null;
  const overflowY = window.getComputedStyle(el).overflowY;
  return overflowY === "auto" || overflowY === "scroll" ? el : null;
}

// The visible reading area: the right column on desktop, the viewport on mobile
export function getScrollViewport(): { top: number; height: number } {
  const scroller = getBlogScroller();
  if (!scroller) return { top: 0, height: window.innerHeight };
  return { top: scroller.getBoundingClientRect().top, height: scroller.clientHeight };
}

export function getScrollTop(): number {
  const scroller = getBlogScroller();
  return scroller ? scroller.scrollTop : window.scrollY;
}

export function scrollToTop() {
  (getBlogScroller() ?? window).scrollTo({ top: 0, behavior: "smooth" });
}

// Calls `handler` when the window or the right column scrolls (scroll events don't bubble,
// so listen in the capture phase and ignore nested scrollers like the comments list).
export function onBlogScroll(handler: () => void): () => void {
  const listener = (event: Event) => {
    const target = event.target;
    if (
      target === document ||
      target === document.documentElement ||
      (target instanceof HTMLElement && target.hasAttribute("data-blog-scroller"))
    ) {
      handler();
    }
  };
  document.addEventListener("scroll", listener, { capture: true, passive: true });
  return () => document.removeEventListener("scroll", listener, { capture: true });
}
