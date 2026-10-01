"use client";

import { useEffect } from "react";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function BlogHeroParallax() {
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>("[data-blog-hero]");
    const heroPanel = document.querySelector<HTMLElement>("[data-blog-hero-panel]");
    const readingShell = document.querySelector<HTMLElement>("[data-blog-reading-shell]");
    if (!hero || !heroPanel || !readingShell) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = hero.getBoundingClientRect();
      const heroTop = hero.offsetTop;
      const distance = Math.max(1, rect.height * 0.82);
      const progress = clamp((window.scrollY - heroTop) / distance, 0, 1);

      hero.style.setProperty("--blog-hero-progress", progress.toFixed(3));
      heroPanel.style.setProperty("--blog-hero-progress", progress.toFixed(3));
      readingShell.style.setProperty("--blog-hero-progress", progress.toFixed(3));
      document.documentElement.style.setProperty(
        "--blog-hero-progress",
        progress.toFixed(3),
      );
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
      document.documentElement.style.removeProperty("--blog-hero-progress");
    };
  }, []);

  return null;
}
