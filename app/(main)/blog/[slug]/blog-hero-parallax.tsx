"use client";

import { useEffect } from "react";
import { getScrollViewport, onBlogScroll } from "./blog-scroller";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

// Drives the cover image's scroll parallax: the photo drifts inside its frame as it
// scrolls away (see .blog-hero-image in page.tsx).
export function BlogHeroParallax() {
  useEffect(() => {
    const media = document.querySelector<HTMLElement>("[data-blog-hero-media]");
    if (!media) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = media.getBoundingClientRect();
      // 0 while the image sits at the top of the reading area, 1 once it has scrolled fully out of view
      const viewTop = Math.max(getScrollViewport().top, 96);
      const progress = clamp((viewTop - rect.top) / Math.max(1, rect.height), 0, 1);
      media.style.setProperty("--blog-hero-progress", progress.toFixed(3));
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    const offScroll = onBlogScroll(requestUpdate);
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      offScroll();
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return null;
}
