"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Film, Search } from "lucide-react";

import { PlatformIcon } from "@/components/platform-icons";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { clipQualityLabels, formatDuration } from "@/lib/display";
import { cn } from "@/lib/utils";

type PlatformKey = "TIKTOK" | "INSTAGRAM" | "YOUTUBE_SHORTS";
type PlatformCell = {
  key: PlatformKey;
  label: string;
  state: "published" | "pending" | "off";
  url: string | null;
};

export type ClipRowVM = {
  id: string;
  title: string;
  durationSec: number | null;
  quality: string;
  responsible: string | null;
  isNew: boolean;
  thumbnailUrl: string | null;
  platforms: PlatformCell[];
  publishedCount: number;
  targetCount: number;
  pubStatus: "none" | "partial" | "complete";
};

const FILTERS = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendientes" },
  { key: "progress", label: "En progreso" },
  { key: "done", label: "Publicados" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

const BRAND_BG: Record<PlatformKey, string> = {
  TIKTOK: "bg-black text-white",
  INSTAGRAM: "text-white",
  YOUTUBE_SHORTS: "bg-[#FF0000] text-white",
};
const BRAND_STYLE: Partial<Record<PlatformKey, React.CSSProperties>> = {
  INSTAGRAM: {
    background:
      "linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)",
  },
};

function PlatformChips({ platforms }: { platforms: PlatformCell[] }) {
  return (
    <div className="flex items-center gap-1.5">
      {platforms.map((p) => {
        if (p.state === "published") {
          return (
            <span
              key={p.key}
              title={`${p.label}: publicado ✓`}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md",
                BRAND_BG[p.key]
              )}
              style={BRAND_STYLE[p.key]}
            >
              <PlatformIcon platform={p.key} className="h-3.5 w-3.5" />
            </span>
          );
        }
        if (p.state === "pending") {
          return (
            <span
              key={p.key}
              title={`${p.label}: pendiente`}
              className="flex h-7 w-7 items-center justify-center rounded-md border bg-muted text-muted-foreground"
            >
              <PlatformIcon platform={p.key} className="h-3.5 w-3.5" />
            </span>
          );
        }
        return (
          <span
            key={p.key}
            title={`${p.label}: no es objetivo`}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-dashed opacity-25"
          >
            <PlatformIcon platform={p.key} className="h-3.5 w-3.5" />
          </span>
        );
      })}
    </div>
  );
}

function StatusBadge({ vm }: { vm: ClipRowVM }) {
  if (vm.pubStatus === "complete") {
    return (
      <Badge className="bg-emerald-600 hover:bg-emerald-600">Publicado</Badge>
    );
  }
  if (vm.pubStatus === "partial") {
    return (
      <Badge
        variant="outline"
        className="border-amber-300 bg-amber-50 text-amber-700"
      >
        Parcial {vm.publishedCount}/{vm.targetCount}
      </Badge>
    );
  }
  return <Badge variant="secondary">Sin publicar</Badge>;
}

function Responsible({ name }: { name: string | null }) {
  if (!name) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span
        title={name}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground"
      >
        {name.slice(0, 2)}
      </span>
      <span className="text-sm text-muted-foreground">{name}</span>
    </span>
  );
}

export function ClipsTable({ clips }: { clips: ClipRowVM[] }) {
  const router = useRouter();
  const [filter, setFilter] = React.useState<FilterKey>("all");
  const [query, setQuery] = React.useState("");

  const counts = React.useMemo(
    () => ({
      all: clips.length,
      pending: clips.filter((c) => c.pubStatus === "none").length,
      progress: clips.filter((c) => c.pubStatus === "partial").length,
      done: clips.filter((c) => c.pubStatus === "complete").length,
    }),
    [clips]
  );

  const rows = React.useMemo(() => {
    const order = { none: 0, partial: 1, complete: 2 };
    const q = query.trim().toLowerCase();
    return clips
      .filter((c) => {
        if (filter === "pending" && c.pubStatus !== "none") return false;
        if (filter === "progress" && c.pubStatus !== "partial") return false;
        if (filter === "done" && c.pubStatus !== "complete") return false;
        if (q && !c.title.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => order[a.pubStatus] - order[b.pubStatus]);
  }, [clips, filter, query]);

  const go = (id: string) => router.push(`/clips/${id}`);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              {f.label}
              <span
                className={cn(
                  "ml-1.5 text-xs",
                  filter === f.key ? "opacity-80" : "opacity-50"
                )}
              >
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar clip…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Clip</th>
              <th className="px-4 py-3 font-medium">Plataformas</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Responsable</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  Nada por aquí con este filtro.
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => go(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") go(c.id);
                  }}
                  tabIndex={0}
                  className="cursor-pointer border-b outline-none transition-colors last:border-0 hover:bg-accent/50 focus-visible:bg-accent/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Film className="h-4 w-4 text-muted-foreground" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">
                            {c.title}
                          </span>
                          {c.isNew ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase"
                            >
                              nuevo
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(c.durationSec)} ·{" "}
                          {clipQualityLabels[c.quality] ?? c.quality}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <PlatformChips platforms={c.platforms} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge vm={c} />
                  </td>
                  <td className="px-4 py-3">
                    <Responsible name={c.responsible} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
