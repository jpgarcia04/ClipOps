import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { verifyPin } from "@/lib/pin";
import {
  clearFailures,
  clientIp,
  isLocked,
  recordFailure,
} from "@/lib/rate-limit";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const key = `login:${clientIp(req)}`;

    // Bloqueo por fuerza bruta: si esta IP ya falló demasiado, rechaza.
    const lock = isLocked(key);
    if (lock.locked) {
      return NextResponse.json(
        {
          error: `Demasiados intentos. Espera ${Math.ceil(
            lock.retryInSec / 60
          )} min e inténtalo de nuevo.`,
        },
        { status: 429 }
      );
    }

    const { name, pin } = await req.json();
    const user = await prisma.user.findUnique({
      where: { name: String(name ?? "").trim() },
    });

    if (!user || !verifyPin(String(pin ?? ""), user.pinHash)) {
      const after = recordFailure(key);
      const msg = after.locked
        ? `Demasiados intentos. Espera ${Math.ceil(
            after.retryInSec / 60
          )} min e inténtalo de nuevo.`
        : "Nombre o PIN incorrecto.";
      return NextResponse.json({ error: msg }, { status: after.locked ? 429 : 401 });
    }

    // Login correcto: limpia el contador de fallos de esta IP.
    clearFailures(key);

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
