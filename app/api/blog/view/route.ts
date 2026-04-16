import { NextRequest, NextResponse } from "next/server";
import { incrementBlogViews } from "@/firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const { blogId } = await req.json();
    if (!blogId) {
      return NextResponse.json({ error: "Missing blogId" }, { status: 400 });
    }
    await incrementBlogViews(blogId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to track view" }, { status: 500 });
  }
}
