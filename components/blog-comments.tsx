"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { User } from "firebase/auth";
import { AlertCircle, Loader2, MessageCircle, Send, ShieldCheck } from "lucide-react";
import { useAuthDialog } from "@/components/auth-dialog-provider";
import { useAuth } from "@/components/auth-provider";
import { addBlogComment, onBlogCommentsSnapshot } from "@/firebase/firestore";
import type { BlogComment } from "@/firebase/firestore";
import { hasProfanity, sanitizeProfanity } from "@/lib/profanity";
import { toast } from "sonner";

interface BlogCommentsProps {
  blogId: string;
}

export function BlogComments({ blogId }: BlogCommentsProps) {
  const { user } = useAuth();
  const { requestSignIn } = useAuthDialog();
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    setLoadingComments(true);
    setCommentsError(null);

    const unsubscribe = onBlogCommentsSnapshot(
      blogId,
      (nextComments) => {
        setComments(nextComments);
        setLoadingComments(false);
      },
      (error) => {
        console.error("Unable to load blog comments.", error);
        setLoadingComments(false);
        setCommentsError("Comments could not be loaded. Please refresh and try again.");
      }
    );

    return () => unsubscribe();
  }, [blogId]);

  const commentCount = comments.length;
  const canSubmit = newComment.trim().length >= 3 && !saving;

  const postComment = async (signedInUser: User, raw: string) => {
    if (savingRef.current) return;

    try {
      savingRef.current = true;
      setSaving(true);
      setSubmitError(null);
      await addBlogComment(blogId, {
        userId: signedInUser.uid,
        userName: signedInUser.displayName || signedInUser.email?.split("@")[0] || "User",
        userEmail: signedInUser.email || "",
        content: sanitizeProfanity(raw),
      });
      setNewComment((current) => current.trim() === raw ? "" : current);
      toast.success("Your comment is live.");
    } catch (error) {
      console.error("Unable to post blog comment.", error);
      const code = getErrorCode(error);
      const message = code.includes("permission-denied")
        ? "Comment posting is temporarily unavailable. Your text is still here—please try again shortly."
        : code.includes("unavailable") || code.includes("network")
          ? "You appear to be offline. Check your connection and try again."
          : "We could not post your comment. Your text is still here—please try again.";
      setSubmitError(message);
      toast.error(message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const raw = newComment.trim();
    if (raw.length < 3) {
      const message = "Comment should be at least 3 characters.";
      setSubmitError(message);
      toast.error(message);
      return;
    }
    if (hasProfanity(raw)) {
      const message = "Please remove abusive language from your comment.";
      setSubmitError(message);
      toast.error(message);
      return;
    }

    if (!user) {
      requestSignIn({
        title: "Sign in to post your comment",
        description:
          "Your comment is saved right here. Continue with Google and we’ll post it automatically when you return.",
        successMessage: "Signed in. Posting your comment…",
        onSuccess: (signedInUser) => postComment(signedInUser, raw),
      });
      return;
    }

    await postComment(user, raw);
  };

  return (
    <section
      id="comments"
      aria-labelledby="comments-heading"
      className="scroll-mt-28 rounded-[1.75rem] border border-orange-100/80 bg-card/90 p-4 shadow-lg shadow-orange-950/5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3 border-b border-orange-100/80 pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Community</p>
          <h3 id="comments-heading" className="mt-1 flex items-center gap-2 text-2xl font-black">
            <MessageCircle className="h-6 w-6 text-orange-500" />
            Comments
          </h3>
        </div>
        <span
          aria-live="polite"
          className="inline-flex min-w-10 items-center justify-center rounded-full bg-orange-50 px-3 py-1.5 text-sm font-black text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
        >
          {commentCount}
        </span>
      </div>

      <form onSubmit={submitComment} className="mt-5 rounded-2xl border border-border/80 bg-background/80 p-3 sm:p-4">
        <label htmlFor="blog-comment" className="text-sm font-bold text-foreground">
          Add a comment
        </label>
        <textarea
          id="blog-comment"
          name="comment"
          value={newComment}
          onChange={(event) => {
            setNewComment(event.target.value);
            if (submitError) setSubmitError(null);
          }}
          placeholder="Share something helpful about this article…"
          className="mt-2 min-h-32 w-full resize-y rounded-2xl border border-input bg-background px-4 py-3 text-base leading-relaxed shadow-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:opacity-70"
          maxLength={500}
          minLength={3}
          disabled={saving}
          aria-invalid={Boolean(submitError)}
          aria-describedby={submitError ? "comment-help comment-error" : "comment-help"}
        />

        <div id="comment-help" className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            {user
              ? "Respectful comments only. Profanity is blocked."
              : "Write first—we’ll ask you to sign in only when you post."}
          </span>
          <span className={newComment.length >= 450 ? "font-bold text-orange-600" : ""}>
            {newComment.length}/500
          </span>
        </div>

        {submitError && (
          <div
            id="comment-error"
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-4 inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/25 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {saving ? "Posting..." : user ? "Post Comment" : "Sign in & Post"}
        </button>
      </form>

      <div className="mt-6 space-y-3" aria-live="polite" aria-busy={loadingComments}>
        {loadingComments ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
            Loading comments…
          </div>
        ) : commentsError ? (
          <div role="status" className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{commentsError}</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 p-5 text-sm leading-relaxed text-muted-foreground">
            No comments yet. Be the first to share a helpful thought.
          </div>
        ) : (
          comments.map((comment) => (
            <article key={comment.id} className="rounded-2xl border border-border/70 bg-background/75 p-4 shadow-sm">
              <div className="mb-3 flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-amber-50 text-sm font-black text-orange-700 ring-1 ring-orange-200 dark:from-orange-950 dark:to-amber-950 dark:text-orange-300 dark:ring-orange-900">
                  {getCommentInitial(comment.userName)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{comment.userName || "Paw Sattva reader"}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatCommentDate(comment.createdAt)}</p>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85 [overflow-wrap:anywhere]">
                {comment.content}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function getErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return "";
  return String(error.code).toLowerCase();
}

function getCommentInitial(name?: string) {
  return name?.trim().charAt(0).toUpperCase() || "P";
}

function formatCommentDate(value?: BlogComment["createdAt"]) {
  if (!value) return "Just now";

  try {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(value.toDate());
  } catch {
    return "Recently";
  }
}
