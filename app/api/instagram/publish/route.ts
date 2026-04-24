import { NextResponse } from "next/server";

type PublishBody = {
  imageUrl?: string;
  caption?: string;
};

const apiVersion = "v23.0";
const graphBaseUrl = `https://graph.facebook.com/${apiVersion}`;

export async function POST(req: Request) {
  try {
    const { imageUrl, caption }: PublishBody = await req.json();
    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required." }, { status: 400 });
    }

    const accessToken = process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN;
    const igUserId = process.env.INSTAGRAM_IG_USER_ID;
    if (!accessToken || !igUserId) {
      return NextResponse.json(
        { error: "Instagram API is not configured on the server." },
        { status: 503 }
      );
    }

    const createMediaRes = await fetch(`${graphBaseUrl}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        caption: caption || "",
        access_token: accessToken,
      }),
      cache: "no-store",
    });

    const createMediaData = await createMediaRes.json();
    if (!createMediaRes.ok || !createMediaData?.id) {
      return NextResponse.json(
        { error: "Failed to create Instagram media container.", details: createMediaData },
        { status: 502 }
      );
    }

    const publishRes = await fetch(`${graphBaseUrl}/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: createMediaData.id,
        access_token: accessToken,
      }),
      cache: "no-store",
    });

    const publishData = await publishRes.json();
    if (!publishRes.ok || !publishData?.id) {
      return NextResponse.json(
        { error: "Failed to publish Instagram media.", details: publishData },
        { status: 502 }
      );
    }

    return NextResponse.json({ id: publishData.id, containerId: createMediaData.id });
  } catch {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
