import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { normalizeOverlay, type TextOverlay } from "@/lib/edit";

export const dynamic = "force-dynamic";

// POST /api/clips/[id]/edit — guarda (upsert) los parámetros de edición
// no-destructiva de un clip. No toca el binario en Drive.
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    const num = (v: unknown): number | null => {
      if (v === null || v === undefined || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const overlays: TextOverlay[] = Array.isArray(body.overlays)
      ? body.overlays
          .map((o: unknown, i: number) => normalizeOverlay(o, i))
          .filter((o: TextOverlay | null): o is TextOverlay => o !== null)
      : [];

    let trimStart = num(body.trimStart);
    let trimEnd = num(body.trimEnd);
    // Sanea: inicio < fin; nada negativo.
    if (trimStart != null && trimStart < 0) trimStart = 0;
    if (trimStart != null && trimEnd != null && trimEnd <= trimStart) {
      trimEnd = null;
    }

    const data = {
      trimStart,
      trimEnd,
      muted: Boolean(body.muted),
      overlays: overlays as unknown as object,
    };

    await prisma.clipEdit.upsert({
      where: { clipId: params.id },
      update: data,
      create: { clipId: params.id, ...data },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[clips/edit]", error);
    return NextResponse.json(
      { error: "No se pudo guardar la edición." },
      { status: 500 }
    );
  }
}
