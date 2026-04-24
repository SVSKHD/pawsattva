"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageCircle, Send } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { addBlogComment, BlogComment, onBlogCommentsSnapshot } from "@/firebase/firestore";
import { hasProfanity, sanitizeProfanity } from "@/lib/profanity";
import { toast } from "sonner";

interface BlogCommentsProps {
  blogId: string;
}

export function BlogComments({ blogId }: BlogCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onBlogCommentsSnapshot(blogId, setComments);
    return () => unsubscribe();
  }, [blogId]);

  const commentCount = comments.length;
  const canSubmit = user && newComment.trim().length >= 3 && !saving;

  const emptyState = useMemo(
    () => (
      <div className="text-sm text-muted-foreground border rounded-xl p-4 bg-muted/20">
        No comments yet. Be the first to share your thoughts.
      </div>
    ),
    []
  );

  const submitComment = async () => {
    if (!user) {
      toast.error("Please login to comment.");
      return;
    }
    const raw = newComment.trim();
    if (raw.length < 3) {
      toast.error("Comment should be at least 3 characters.");
      return;
    }
    const sanitized = sanitizeProfanity(raw);
    if (hasProfanity(raw)) {
      toast.warning("Profanity was detected and masked automatically.");
    }

    try {
      setSaving(true);
      await addBlogComment(blogId, {
        userId: user.uid,
        userName: user.displayName || user.email?.split("@")[0] || "User",
        userEmail: user.email || "",
        content: sanitized,
      });
      setNewComment("");
      toast.success("Comment posted.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to post comment.";
      if (message.toLowerCase().includes("permission")) {
        toast.error("Comment failed: permission denied. Please login again and try.");
      } else {
        toast.error(message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-10 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-orange-500" />
          Comments ({commentCount})
        </h3>
      </div>

      {!user ? (
        <div className="border rounded-xl p-4 bg-orange-50/60 dark:bg-orange-900/10 text-sm">
          Please{" "}
          <Link href="/login" className="font-semibold text-orange-600 underline">
            login
          </Link>{" "}
          to post comments.
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write your comment..."
            className="w-full min-h-[90px] rounded-xl border px-3 py-2 bg-background"
            maxLength={500}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Profanity is blocked automatically.</span>
            <span>{newComment.length}/500</span>
          </div>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submitComment}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {saving ? "Posting..." : "Post Comment"}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {comments.length === 0 && emptyState}
        {comments.map((comment) => (
          <article key={comment.id} className="border rounded-xl p-4 bg-background/70">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-sm">{comment.userName}</p>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
