import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

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
