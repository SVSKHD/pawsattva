"use client";

import { useState, useEffect, useId } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";

const STORAGE_KEY = "pawsattva_reaction_";
const SYNC_EVENT = "pawsattva:reaction";

type Reaction = "like" | "dislike";

interface ReactionEventDetail {
  blogId: string;
  /** Which component instance sent it, so it ignores its own echo */
  source: string;
  reaction: Reaction | null;
  delta: { likes: number; dislikes: number };
}

interface BlogReactionsProps {
  blogId: string;
  initialLikes: number;
  initialDislikes: number;
  /** "full": labelled pills for the article; "compact": small counters for cards */
  variant?: "full" | "compact";
  /** Subscribe to live counts from Firestore (use on the article, not on every card in a list) */
  live?: boolean;
}

const readStored = (blogId: string): Reaction | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY + blogId);
    return stored === "like" || stored === "dislike" ? stored : null;
  } catch {
    return null;
  }
};

export function BlogReactions({
  blogId,
  initialLikes,
  initialDislikes,
  variant = "full",
  live = variant === "full",
}: BlogReactionsProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [userReaction, setUserReaction] = useState<Reaction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const instanceId = useId();
  const { isBlacklisted } = useAuth();

  // Restore this browser's earlier reaction, and keep other copies of the same post in sync
  useEffect(() => {
    // localStorage is only readable after hydration
    setUserReaction(readStored(blogId));
    const onSync = (event: Event) => {
      const detail = (event as CustomEvent<ReactionEventDetail>).detail;
      if (detail.blogId !== blogId || detail.source === instanceId) return;
      setUserReaction(detail.reaction);
      if (!live) {
        setLikes((value) => value + detail.delta.likes);
        setDislikes((value) => value + detail.delta.dislikes);
      }
    };
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, [blogId, live, instanceId]);

  // Firestore is loaded only for live counters (the article page), never for list cards,
  // so the blog list doesn't download the SDK just to render like buttons.
  useEffect(() => {
    if (!live) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void Promise.all([import("firebase/firestore"), import("@/firebase/db")]).then(
      ([{ doc, onSnapshot }, { db }]) => {
        if (!active) return;
        unsubscribe = onSnapshot(
          doc(db, "blogs", blogId),
          (snapshot) => {
            if (!snapshot.exists()) return;
            const data = snapshot.data();
            setLikes(data.likes ?? 0);
            setDislikes(data.dislikes ?? 0);
          },
          (error) => console.error("Unable to watch reaction counts:", error)
        );
      }
    );
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [blogId, live]);

  const apply = (reaction: Reaction | null, delta: ReactionEventDetail["delta"]) => {
    setLikes((value) => value + delta.likes);
    setDislikes((value) => value + delta.dislikes);
    setUserReaction(reaction);
    try {
      if (reaction) localStorage.setItem(STORAGE_KEY + blogId, reaction);
      else localStorage.removeItem(STORAGE_KEY + blogId);
    } catch {
      // Private mode: the reaction still counts, it just isn't remembered
    }
    window.dispatchEvent(
      new CustomEvent<ReactionEventDetail>(SYNC_EVENT, { detail: { blogId, source: instanceId, reaction, delta } })
    );
  };

  const handleReaction = async (action: Reaction, event?: React.MouseEvent) => {
    // Cards sit inside a clickable area; never let a reaction open the post
    event?.preventDefault();
    event?.stopPropagation();
    if (userReaction || submitting || isBlacklisted) return;
    setSubmitting(true);

    const delta = action === "like" ? { likes: 1, dislikes: 0 } : { likes: 0, dislikes: 1 };
    apply(action, delta);

    try {
      const res = await fetch("/api/blog/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blogId, action }),
      });
      if (!res.ok) throw new Error(`Reaction failed: ${res.status}`);
      void import("@/firebase/analytics").then(({ trackEvent }) =>
        trackEvent("blog_reaction", { blog_id: blogId, reaction: action, placement: variant === "compact" ? "card" : "article" })
      );
    } catch {
      apply(null, { likes: -delta.likes, dislikes: -delta.dislikes });
      toast.error("Couldn't save your reaction. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (variant === "compact") {
    const pill = (active: boolean, tone: "like" | "dislike") =>
      `inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs font-semibold tabular-nums transition ${
        active
          ? tone === "like"
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
            : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
          : userReaction
            ? "text-muted-foreground/70"
            : tone === "like"
              ? "text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-700"
              : "text-muted-foreground hover:bg-rose-500/10 hover:text-rose-700"
      }`;

    return (
      <div className="relative z-10 flex items-center gap-0.5">
        <button
          type="button"
          onClick={(e) => handleReaction("like", e)}
          disabled={!!userReaction || submitting || isBlacklisted}
          aria-pressed={userReaction === "like"}
          aria-label={`Like (${likes})`}
          title={userReaction ? "Thanks for your feedback" : "Helpful"}
          className={pill(userReaction === "like", "like")}
        >
          <ThumbsUp className={`h-3.5 w-3.5 ${userReaction === "like" ? "fill-emerald-500" : ""}`} />
          {likes.toLocaleString("en-IN")}
        </button>
        <button
          type="button"
          onClick={(e) => handleReaction("dislike", e)}
          disabled={!!userReaction || submitting || isBlacklisted}
          aria-pressed={userReaction === "dislike"}
          aria-label={`Dislike (${dislikes})`}
          title={userReaction ? "Thanks for your feedback" : "Not helpful"}
          className={pill(userReaction === "dislike", "dislike")}
        >
          <ThumbsDown className={`h-3.5 w-3.5 ${userReaction === "dislike" ? "fill-rose-500" : ""}`} />
          {dislikes.toLocaleString("en-IN")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => handleReaction("like")}
        disabled={!!userReaction || submitting || isBlacklisted}
        aria-pressed={userReaction === "like"}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border-2
          ${userReaction === "like"
            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
            : userReaction
              ? "bg-muted/30 text-muted-foreground border-transparent cursor-default opacity-60"
              : "bg-background text-muted-foreground border-muted hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
          }`}
      >
        <ThumbsUp className={`w-4 h-4 ${userReaction === "like" ? "fill-emerald-500" : ""}`} />
        {likes.toLocaleString("en-IN")}
      </button>

      <button
        type="button"
        onClick={() => handleReaction("dislike")}
        disabled={!!userReaction || submitting || isBlacklisted}
        aria-pressed={userReaction === "dislike"}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border-2
          ${userReaction === "dislike"
            ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
            : userReaction
              ? "bg-muted/30 text-muted-foreground border-transparent cursor-default opacity-60"
              : "bg-background text-muted-foreground border-muted hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
          }`}
      >
        <ThumbsDown className={`w-4 h-4 ${userReaction === "dislike" ? "fill-rose-500" : ""}`} />
        {dislikes.toLocaleString("en-IN")}
      </button>

      {userReaction && (
        <span className="text-xs text-muted-foreground ml-1">
          Thanks for your feedback!
        </span>
      )}
    </div>
  );
}
