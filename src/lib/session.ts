import { SignJWT, jwtVerify } from "jose";

// Sesión firmada (HS256) — compatible con el middleware (Edge runtime).
export const SESSION_COOKIE = "clipops_session";

export type SessionPayload = { uid: string; name: string };

function key() {
  return new TextEncoder().encode(
    process.env.AUTH_SECRET || "dev-insecure-secret-change-me"
  );
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d") // dispositivo de confianza: 30 días
    .sign(key());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key());
    if (typeof payload.uid === "string" && typeof payload.name === "string") {
      return { uid: payload.uid, name: payload.name };
    }
    return null;
  } catch {
    return null;
  }
}
