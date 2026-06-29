"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [users, setUsers] = React.useState<string[]>([]);
  const [name, setName] = React.useState<string | null>(null);
  const [pin, setPin] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/auth/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .catch(() => {});
  }, []);

  const login = async () => {
    if (!name || !pin) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pin }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "No se pudo entrar");
      }
      router.replace("/today");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo entrar");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Image
            src="/logo.png"
            alt="ClipOps"
            width={64}
            height={64}
            priority
            className="h-16 w-16 rounded-2xl shadow-sm"
          />
          <h1 className="text-lg font-semibold">ClipOps</h1>
          <p className="text-sm text-muted-foreground">Entra con tu PIN</p>
        </div>

        {users.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Aún no hay usuarios.{" "}
            <Link href="/register" className="text-primary hover:underline">
              Regístrate
            </Link>
            .
          </p>
        ) : !name ? (
          <div className="space-y-2">
            <p className="text-center text-sm text-muted-foreground">
              ¿Quién eres?
            </p>
            {users.map((u) => (
              <Button
                key={u}
                variant="outline"
                className="w-full"
                onClick={() => setName(u)}
              >
                {u}
              </Button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-center text-sm">
              Hola, <span className="font-semibold">{name}</span>
            </p>
            <Input
              autoFocus
              type="password"
              inputMode="numeric"
              placeholder="Tu PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") login();
              }}
              className="text-center text-lg tracking-[0.3em]"
            />
            {error ? (
              <p className="text-center text-sm text-destructive">{error}</p>
            ) : null}
            <Button
              className="w-full"
              onClick={login}
              disabled={loading || !pin}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Entrar
            </Button>
            <button
              type="button"
              onClick={() => {
                setName(null);
                setPin("");
                setError(null);
              }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              ← Cambiar de usuario
            </button>
          </div>
        )}

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/register" className="hover:text-foreground">
            Registrar dispositivo
          </Link>
        </div>
      </div>
    </div>
  );
}
