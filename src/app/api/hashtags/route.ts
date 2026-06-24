import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

function normalize(input: string) {
  const t = input
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, "")
    .toLowerCase();
  return t ? `#${t}` : "";
}

// POST /api/hashtags — añade un hashtag al banco global (reutilizable en todos
// los clips). Idempotente: si ya existe, no duplica.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const tag = normalize(String(body?.tag ?? ""));
    if (!tag || tag === "#") {
      return NextResponse.json({ error: "Hashtag vacío." }, { status: 400 });
    }
    await prisma.hashtag.upsert({
      where: { tag },
      update: {},
      create: { tag },
    });
    return NextResponse.json({ ok: true, tag });
  } catch (error) {
    console.error("[hashtags]", error);
    return NextResponse.json(
      { error: "No se pudo guardar el hashtag." },
      { status: 500 }
    );
  }
}
