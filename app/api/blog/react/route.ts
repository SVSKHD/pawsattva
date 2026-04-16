import { NextRequest, NextResponse } from "next/server";
import { incrementBlogLikes, incrementBlogDislikes } from "@/firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const { blogId, action } = await req.json();

    if (!blogId || !action) {
      return NextResponse.json({ error: "Missing blogId or action" }, { status: 400 });
    }

    if (action === "like") {
      await incrementBlogLikes(blogId);
    } else if (action === "dislike") {
      await incrementBlogDislikes(blogId);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to process reaction" }, { status: 500 });
  }
}
