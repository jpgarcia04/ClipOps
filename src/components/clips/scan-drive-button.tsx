"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CloudDownload, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ScanDriveButton() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const scan = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/drive/scan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "error");
      setMessage(
        data.created > 0
          ? `+${data.created} clip(s) nuevos desde Drive`
          : "Sin clips nuevos"
      );
      router.refresh(); // re-renderiza la tabla con los nuevos pendientes
    } catch {
      setMessage("Error al buscar en Drive");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {message ? (
        <span className="text-xs text-muted-foreground">{message}</span>
      ) : null}
      <Button onClick={scan} disabled={loading}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CloudDownload className="h-4 w-4" />
        )}
        Buscar en Drive
      </Button>
    </div>
  );
}
