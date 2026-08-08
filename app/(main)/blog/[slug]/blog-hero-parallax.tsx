"use client";

import { useEffect } from "react";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function BlogHeroParallax() {
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>("[data-blog-hero]");
    if (!hero) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = hero.getBoundingClientRect();
      const distance = Math.max(1, rect.height * 0.72);
      const progress = clamp(-rect.top / distance, 0, 1);

      hero.style.setProperty("--blog-hero-progress", progress.toFixed(3));
      hero.dataset.scrolled = progress > 0.08 ? "true" : "false";
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return null;
}
