"use client";

import { useEffect } from "react";
import { logEvent } from "@/firebase/analytics";

const SESSION_KEY = "pawsattva_viewed_";

export function BlogViewTracker({ blogId, title }: { blogId: string; title: string }) {
  useEffect(() => {
    // Only count once per session per post
    const key = SESSION_KEY + blogId;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    // Increment Firestore view counter
    fetch("/api/blog/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blogId }),
    }).catch(() => {});

    // Also log to Firebase Analytics
    logEvent("blog_view", { blog_id: blogId, blog_title: title });
  }, [blogId, title]);

  return null;
}
