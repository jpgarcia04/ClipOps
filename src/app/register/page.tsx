"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const [secret, setSecret] = React.useState("");
  const [name, setName] = React.useState("");
  const [pin, setPin] = React.useState("");
  const [pin2, setPin2] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Pon tu nombre.");
      return;
    }
    if (pin.length < 6) {
      setError("El PIN debe tener al menos 6 dígitos.");
      return;
    }
    if (pin !== pin2) {
      setError("Los PIN no coinciden.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, name: name.trim(), pin }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "No se pudo registrar");
      }
      router.replace("/today");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar");
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
            width={56}
            height={56}
            priority
            className="h-14 w-14 rounded-2xl shadow-sm"
          />
          <h1 className="text-lg font-semibold">Registrar dispositivo</h1>
          <p className="text-sm text-muted-foreground">
            Crea tu acceso con un PIN.
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Código de registro</Label>
            <Input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Código secreto"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tu nombre</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jp / Topo"
            />
          </div>
          <div className="space-y-1.5">
            <Label>PIN</Label>
            <Input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Mínimo 6 dígitos"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Confirma tu PIN</Label>
            <Input
              type="password"
              inputMode="numeric"
              value={pin2}
              onChange={(e) => setPin2(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Crear acceso
          </Button>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/login" className="hover:text-foreground">
            ← Volver a entrar
          </Link>
        </div>
      </div>
    </div>
  );
}
