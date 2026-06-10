import { NextResponse } from "next/server";

import { PLATFORM_META } from "@/lib/platforms";
import { publishClipToPlatform } from "@/lib/publish";

// POST /api/posts/publish — registra una publicación (caption + hashtags
// reales usados + URL) y marca el clip como publicado.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clipId, platform, caption, hashtags, url } = body ?? {};

    if (!clipId || !platform || !url) {
      return NextResponse.json(
        { error: "Faltan datos: clipId, platform y url son obligatorios." },
        { status: 400 }
      );
    }
    if (!(platform in PLATFORM_META)) {
      return NextResponse.json(
        { error: "Plataforma no válida." },
        { status: 400 }
      );
    }

    const post = await publishClipToPlatform({
      clipId,
      platform,
      caption: caption ?? null,
      hashtags: Array.isArray(hashtags) ? hashtags : [],
      url,
    });

    return NextResponse.json({ ok: true, postId: post.id });
  } catch (error) {
    console.error("[posts/publish]", error);
    return NextResponse.json(
      { error: "No se pudo registrar la publicación." },
      { status: 500 }
    );
  }
}
