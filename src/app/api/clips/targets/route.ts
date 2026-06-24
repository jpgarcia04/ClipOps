import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { PLATFORM_META, type PlatformKey } from "@/lib/platforms";

// POST /api/clips/targets — actualiza las redes objetivo de un clip.
// Se guarda al instante cada vez que el usuario activa/desactiva una red.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clipId, platforms } = body ?? {};

    if (!clipId || !Array.isArray(platforms)) {
      return NextResponse.json(
        { error: "Faltan datos: clipId y platforms." },
        { status: 400 }
      );
    }

    const valid = (platforms as string[]).filter(
      (p): p is PlatformKey => p in PLATFORM_META
    );

    await prisma.clip.update({
      where: { id: clipId },
      data: { targetPlatforms: valid },
    });

    return NextResponse.json({ ok: true, targetPlatforms: valid });
  } catch (error) {
    console.error("[clips/targets]", error);
    return NextResponse.json(
      { error: "No se pudo actualizar las redes objetivo." },
      { status: 500 }
    );
  }
}
