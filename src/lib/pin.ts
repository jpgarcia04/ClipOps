import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

// Hash de PIN con scrypt (sin dependencias extra). Formato "salt:hash".
// Solo se usa en route handlers (runtime Node), nunca en el middleware.
export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const computed = scryptSync(pin, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return (
    computed.length === expected.length && timingSafeEqual(computed, expected)
  );
}
