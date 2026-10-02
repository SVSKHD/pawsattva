"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Sends one GA4 page_view per route (initial load and every client-side navigation), and
 * tracks clicks on any element marked with data-track="<event>" — its data-track-* attributes
 * become event params. That lets server components (e.g. /walks) track clicks without JS.
 */
export function FirebaseAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    let cancelled = false;
    const trackPage = async () => {
      const { logPageView } = await import("@/firebase/analytics");
      // Read the title at send time; by now the new page's metadata has replaced the old one
      if (!cancelled) await logPageView(document.title);
    };

    const idleId = window.requestIdleCallback?.(
      () => void trackPage(),
      { timeout: 2500 }
    );
    const timeoutId = idleId === undefined
      ? window.setTimeout(() => void trackPage(), 1200)
      : undefined;

    return () => {
      cancelled = true;
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = (event.target as Element | null)?.closest<HTMLElement>("[data-track]");
      if (!target) return;
      const name = target.dataset.track;
      if (!name) return;
      const params: Record<string, string> = {};
      for (const [key, value] of Object.entries(target.dataset)) {
        // data-track-place-id → place_id
        if (key.startsWith("track") && key !== "track" && value) {
          const param = key.slice(5).replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`).replace(/^_/, "");
          params[param] = value;
        }
      }
      void import("@/firebase/analytics").then(({ trackEvent }) =>
        trackEvent(name as Parameters<typeof trackEvent>[0], params)
      );
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
