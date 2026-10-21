import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { createHash, timingSafeEqual } from "node:crypto";
import { adminDb } from "@/lib/server/firebase-admin";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const secret = process.env.PAWSATTVA_DRAFT_API_KEY;
  const supplied = /^Bearer[ \t]+(\S+)$/i.exec(request.headers.get("authorization")?.trim() ?? "")?.[1] ?? "";
  if (!secret || !supplied) return false;
  const a = createHash("sha256").update(secret).digest();
  const b = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(a, b);
}

// Same rule the admin panel uses when it derives a slug from a title.
const toSlug = (title: string) =>
  title.toLowerCase().trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    if (Number(request.headers.get("content-length") || 0) > 300000) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    const payload = await request.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const fields = ["title", "excerpt", "seoTitle", "image", "content"];
    if (fields.some((field) => typeof payload[field] !== "string" || !payload[field].trim())) {
      return NextResponse.json({ error: "Missing required blog fields" }, { status: 400 });
    }
    if (!Array.isArray(payload.keywords) || !payload.keywords.length ||
        payload.keywords.some((keyword: unknown) => typeof keyword !== "string")) {
      return NextResponse.json({ error: "keywords must be a nonempty string array" }, { status: 400 });
    }
    if (payload.title.length > 200 || payload.excerpt.length > 1000 ||
        payload.seoTitle.length > 200 || payload.content.length > 200000 ||
        payload.keywords.length > 30) {
      return NextResponse.json({ error: "Field limit exceeded" }, { status: 400 });
    }

    const title = payload.title.trim();
    const excerpt = payload.excerpt.trim();
    const seoTitle = payload.seoTitle.trim();
    const image = payload.image.trim();
    const keywords = payload.keywords.map((keyword: string) => keyword.trim()).filter(Boolean);
    const fingerprint = createHash("sha256").update(title.toLowerCase()).digest("hex");

    // AI posts land in /blogs as "pending_review": they show under the admin Review tab and stay
    // off the public site (which only lists "published") until an admin approves them.
    const db = adminDb();
    const ref = db.collection("blogs").doc(`ai-${fingerprint.slice(0, 32)}`);
    const result = await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      if (existing.exists) return { created: false, slug: existing.get("slug") as string };
      let slug = toSlug(title) || `ai-post-${fingerprint.slice(0, 8)}`;
      const clash = await transaction.get(db.collection("blogs").where("slug", "==", slug).limit(1));
      if (!clash.empty) slug = `${slug}-${fingerprint.slice(0, 6)}`;
      transaction.create(ref, {
        title, slug, excerpt, image, content: payload.content,
        keywords: keywords.join(", "),
        seo: {
          title: seoTitle, description: excerpt, keywords,
          canonicalUrl: `https://pawsattva.com/blog/${slug}`, robots: "index,follow", image,
          ogTitle: seoTitle, ogDescription: excerpt, ogImage: image,
          twitterTitle: seoTitle, twitterDescription: excerpt, twitterImage: image,
        },
        categoryId: "", categoryIds: [],
        authorName: "Paw AI",
        status: "pending_review", source: "ai-integration",
        likes: 0, dislikes: 0, views: 0, commentsCount: 0,
        reviewRequestedAt: FieldValue.serverTimestamp(),
        date: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      return { created: true, slug };
    });
    return NextResponse.json(
      { id: ref.id, slug: result.slug, status: "pending_review", created: result.created },
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    console.error("blog-drafts: failed to save draft", error);
    return NextResponse.json({ error: "Unable to save draft" }, { status: 500 });
  }
}
