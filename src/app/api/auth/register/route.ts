import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { hashPin } from "@/lib/pin";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const { secret, name, pin } = await req.json();

    const expected = process.env.REGISTRATION_SECRET;
    if (!expected || secret !== expected) {
      return NextResponse.json(
        { error: "Código de registro incorrecto." },
        { status: 401 }
      );
    }

    const cleanName = String(name ?? "").trim();
    const cleanPin = String(pin ?? "").trim();
    if (!cleanName || cleanPin.length < 6) {
      return NextResponse.json(
        { error: "Nombre requerido y PIN de al menos 6 dígitos." },
        { status: 400 }
      );
    }

    const user = await prisma.user.upsert({
      where: { name: cleanName },
      update: { pinHash: hashPin(cleanPin) },
      create: { name: cleanName, pinHash: hashPin(cleanPin) },
    });

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
    console.error("[auth/register]", error);
    return NextResponse.json({ error: "No se pudo registrar." }, { status: 500 });
  }
}
