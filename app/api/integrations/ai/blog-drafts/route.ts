import { NextRequest, NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { createHash, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const secret = process.env.PAWSATTVA_DRAFT_API_KEY;
  const supplied = /^Bearer[ \t]+(\S+)$/i.exec(request.headers.get("authorization")?.trim() ?? "")?.[1] ?? "";
  if (!secret || !supplied) return false;
  const a = createHash("sha256").update(secret).digest();
  const b = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(a, b);
}

function database() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!projectId || !clientEmail || !privateKey) throw new Error("Firebase Admin credentials missing");
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }
  return getFirestore();
}

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
    const fingerprint = createHash("sha256").update(payload.title.trim().toLowerCase()).digest("hex");
    const ref = database().collection("aiBlogDrafts").doc(fingerprint);
    const result = await database().runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      if (existing.exists) return false;
      transaction.create(ref, {
        title: payload.title.trim(), excerpt: payload.excerpt.trim(),
        keywords: payload.keywords, seoTitle: payload.seoTitle.trim(),
        image: payload.image.trim(), content: payload.content,
        status: "draft", publishedAt: null, source: "ai-integration",
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      return true;
    });
    return NextResponse.json({ id: ref.id, status: "draft", created: result }, { status: result ? 201 : 200 });
  } catch (error) {
    console.error("blog-drafts: failed to save draft", error);
    return NextResponse.json({ error: "Unable to save draft" }, { status: 500 });
  }
}
