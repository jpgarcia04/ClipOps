import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

// POST /api/clips/[id]/rename — renombra el clip SOLO en la app (Drive intacto).
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const title = String(body?.title ?? "").trim();
    if (!title) {
      return NextResponse.json(
        { error: "El título no puede estar vacío." },
        { status: 400 }
      );
    }
    await prisma.clip.update({
      where: { id: params.id },
      data: { title },
    });
    return NextResponse.json({ ok: true, title });
  } catch (error) {
    console.error("[clips/rename]", error);
    return NextResponse.json(
      { error: "No se pudo renombrar." },
      { status: 500 }
    );
  }
}
