import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

// Siempre consulta la DB en cada petición. Sin esto, Next.js 14 cachea este
// GET en el build (cuando la DB está vacía) y el login mostraría "no hay
// usuarios" para siempre.
export const dynamic = "force-dynamic";

// Lista solo los nombres (para los botones del login). No es sensible.
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { name: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ users: users.map((u) => u.name) });
  } catch {
    return NextResponse.json({ users: [] });
  }
}
