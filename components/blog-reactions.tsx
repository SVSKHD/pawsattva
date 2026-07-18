"use client";

import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/db";

const STORAGE_KEY = "pawsattva_reaction_";

interface BlogReactionsProps {
  blogId: string;
  initialLikes: number;
  initialDislikes: number;
}

export function BlogReactions({ blogId, initialLikes, initialDislikes }: BlogReactionsProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [userReaction, setUserReaction] = useState<"like" | "dislike" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY + blogId);
    if (stored === "like" || stored === "dislike") {
      setUserReaction(stored);
    }
  }, [blogId]);

  useEffect(() => {
    const blogRef = doc(db, "blogs", blogId);
    return onSnapshot(blogRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      setLikes(data.likes ?? 0);
      setDislikes(data.dislikes ?? 0);
    });
  }, [blogId]);

  const handleReaction = async (action: "like" | "dislike") => {
    if (userReaction || submitting) return;
    setSubmitting(true);

    // Optimistic update
    if (action === "like") setLikes((l) => l + 1);
    else setDislikes((d) => d + 1);
    setUserReaction(action);
    localStorage.setItem(STORAGE_KEY + blogId, action);

    try {
      await fetch("/api/blog/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blogId, action }),
      });
    } catch {
      // Rollback on failure
      if (action === "like") setLikes((l) => l - 1);
      else setDislikes((d) => d - 1);
      setUserReaction(null);
      localStorage.removeItem(STORAGE_KEY + blogId);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => handleReaction("like")}
        disabled={!!userReaction || submitting}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border-2
          ${userReaction === "like"
            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
            : userReaction
              ? "bg-muted/30 text-muted-foreground border-transparent cursor-default opacity-60"
              : "bg-background text-muted-foreground border-muted hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50"
          }`}
      >
        <ThumbsUp className={`w-4 h-4 ${userReaction === "like" ? "fill-emerald-500" : ""}`} />
        {likes.toLocaleString()}
      </button>

      <button
        type="button"
        onClick={() => handleReaction("dislike")}
        disabled={!!userReaction || submitting}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border-2
          ${userReaction === "dislike"
            ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
            : userReaction
              ? "bg-muted/30 text-muted-foreground border-transparent cursor-default opacity-60"
              : "bg-background text-muted-foreground border-muted hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50"
          }`}
      >
        <ThumbsDown className={`w-4 h-4 ${userReaction === "dislike" ? "fill-rose-500" : ""}`} />
        {dislikes.toLocaleString()}
      </button>

      {userReaction && (
        <span className="text-xs text-muted-foreground ml-1">
          Thanks for your feedback!
        </span>
      )}
    </div>
  );
}
