// Rate limiter en memoria (sin dependencias). Suficiente para 1 contenedor de
// app: el estado vive en el módulo y persiste entre peticiones. Se reinicia si
// el contenedor se reinicia (aceptable). Pensado para frenar fuerza bruta de
// PIN en el login, bloqueando por IP.

type Entry = { fails: number; firstFailAt: number; lockedUntil: number };

const store = new Map<string, Entry>();

const MAX_FAILS = 5; // intentos fallidos antes de bloquear
const WINDOW_MS = 15 * 60 * 1000; // ventana en la que cuentan los fallos
const LOCK_MS = 15 * 60 * 1000; // duración del bloqueo

/** ¿Está la clave bloqueada ahora mismo? */
export function isLocked(key: string): { locked: boolean; retryInSec: number } {
  const e = store.get(key);
  if (e && e.lockedUntil > Date.now()) {
    return { locked: true, retryInSec: Math.ceil((e.lockedUntil - Date.now()) / 1000) };
  }
  return { locked: false, retryInSec: 0 };
}

/** Registra un intento fallido; devuelve si quedó bloqueado. */
export function recordFailure(key: string): { locked: boolean; retryInSec: number } {
  const now = Date.now();
  let e = store.get(key);

  // Si la ventana caducó, reinicia el conteo.
  if (!e || now - e.firstFailAt > WINDOW_MS) {
    e = { fails: 0, firstFailAt: now, lockedUntil: 0 };
  }

  e.fails += 1;
  if (e.fails >= MAX_FAILS) {
    e.lockedUntil = now + LOCK_MS;
  }
  store.set(key, e);

  return e.lockedUntil > now
    ? { locked: true, retryInSec: Math.ceil((e.lockedUntil - now) / 1000) }
    : { locked: false, retryInSec: 0 };
}

/** Limpia el estado de una clave (tras un login correcto). */
export function clearFailures(key: string): void {
  store.delete(key);
}

/** Extrae la IP del cliente respetando el proxy (Caddy pone X-Forwarded-For). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
