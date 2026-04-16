"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initAnalytics, logPageView } from "@/firebase/analytics";

export function FirebaseAnalytics() {
  const pathname = usePathname();

  // Initialize analytics once on mount
  useEffect(() => {
    initAnalytics();
  }, []);

  // Log page view on every route change
  useEffect(() => {
    if (pathname) {
      logPageView(pathname, document.title);
    }
  }, [pathname]);

  return null;
}
