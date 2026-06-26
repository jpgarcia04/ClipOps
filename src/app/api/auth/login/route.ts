import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { verifyPin } from "@/lib/pin";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const { name, pin } = await req.json();
    const user = await prisma.user.findUnique({
      where: { name: String(name ?? "").trim() },
    });

    if (!user || !verifyPin(String(pin ?? ""), user.pinHash)) {
      return NextResponse.json(
        { error: "Nombre o PIN incorrecto." },
        { status: 401 }
      );
    }

    const token = await createSessionToken({ uid: user.id, name: user.name });
    const res = NextResponse.json({ ok: true, name: user.name });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json(
      { error: "No se pudo iniciar sesión." },
      { status: 500 }
    );
  }
}
