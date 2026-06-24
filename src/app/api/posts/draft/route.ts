import { NextResponse } from "next/server";

import { PLATFORM_META } from "@/lib/platforms";
import { saveDraftForPlatforms } from "@/lib/publish";

// POST /api/posts/draft — guarda un borrador (caption + hashtags) para una o
// varias plataformas, sin publicar.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clipId, platforms, caption, hashtags } = body ?? {};

    if (!clipId || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: "Faltan datos: clipId y al menos una plataforma." },
        { status: 400 }
      );
    }

    const valid = platforms.filter((p: string) => p in PLATFORM_META);
    if (valid.length === 0) {
      return NextResponse.json(
        { error: "Plataformas no válidas." },
        { status: 400 }
      );
    }

    const result = await saveDraftForPlatforms({
      clipId,
      platforms: valid,
      caption: caption ?? null,
      hashtags: Array.isArray(hashtags) ? hashtags : [],
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[posts/draft]", error);
    return NextResponse.json(
      { error: "No se pudo guardar el borrador." },
      { status: 500 }
    );
  }
}
