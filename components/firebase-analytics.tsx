"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function FirebaseAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    let cancelled = false;
    const trackPage = async () => {
      const { logPageView } = await import("@/firebase/analytics");
      if (!cancelled) await logPageView(pathname, document.title);
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

  return null;
}
