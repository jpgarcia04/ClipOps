"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { PlatformIcon } from "@/components/platform-icons";
import { Badge } from "@/components/ui/badge";
import { clipQualityLabels, formatDuration } from "@/lib/display";
import { cn } from "@/lib/utils";

type PlatformKey = "TIKTOK" | "INSTAGRAM" | "YOUTUBE_SHORTS";

export type QueueItem = {
  id: string;
  title: string;
  durationSec: number | null;
  quality: string;
  isDraft: boolean;
  caption: string | null;
};
export type QueueColumn = { key: PlatformKey; label: string; items: QueueItem[] };

export function QueueBoard({ columns }: { columns: QueueColumn[] }) {
  const [filter, setFilter] = React.useState<"all" | PlatformKey>("all");

  const total = columns.reduce((n, c) => n + c.items.length, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <CheckCircle2 className="mb-3 h-8 w-8 text-emerald-600" />
        <p className="font-medium">¡Todo al día!</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          No hay nada pendiente por subir. Busca clips nuevos en Drive o prepara
          borradores desde un clip.
        </p>
      </div>
    );
  }

  const shown = filter === "all" ? columns : columns.filter((c) => c.key === filter);
  const tabs = [
    { key: "all" as const, label: "Todas", count: total },
    ...columns.map((c) => ({ key: c.key, label: c.label, count: c.items.length })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex w-fit flex-wrap gap-1 rounded-lg border bg-card p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              filter === t.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            {t.label}
            <span
              className={cn(
                "ml-1.5 text-xs",
                filter === t.key ? "opacity-80" : "opacity-50"
              )}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <div className={cn("grid gap-4", filter === "all" && "lg:grid-cols-3")}>
        {shown.map((col) => (
          <div key={col.key} className="rounded-lg border bg-card">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                <PlatformIcon platform={col.key} className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold">{col.label}</span>
              <Badge variant="secondary" className="ml-auto">
                {col.items.length}
              </Badge>
            </div>
            <div className="space-y-2 p-3">
              {col.items.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Nada pendiente aquí ✅
                </p>
              ) : (
                col.items.map((item) => (
                  <Link
                    key={item.id}
                    href={`/clips/${item.id}`}
                    className="block rounded-md border p-3 transition-colors hover:bg-accent"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {item.title}
                      </span>
                      {item.isDraft ? (
                        <Badge
                          variant="outline"
                          className="shrink-0 border-sky-300 bg-sky-50 text-sky-700"
                        >
                          Listo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="shrink-0">
                          Por preparar
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDuration(item.durationSec)} ·{" "}
                      {clipQualityLabels[item.quality] ?? item.quality}
                    </p>
                    {item.isDraft && item.caption ? (
                      <p className="mt-1 truncate text-xs italic text-muted-foreground">
                        “{item.caption}”
                      </p>
                    ) : null}
                  </Link>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
