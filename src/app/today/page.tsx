import type { CSSProperties } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  DownloadCloud,
  Film,
  Flag,
  Flame,
  PartyPopper,
  Sparkles,
  UploadCloud,
  Wand2,
} from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PlatformIcon } from "@/components/platform-icons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getTodayOps,
  type TodayActionKind,
  type TodayOps,
} from "@/lib/data";
import { clipQualityLabels, formatDuration } from "@/lib/display";
import type { PlatformKey } from "@/lib/platforms";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TZ = "America/Mexico_City";

const TONE: Record<string, string> = {
  violet: "bg-violet-100 text-violet-700",
  sky: "bg-sky-100 text-sky-700",
  amber: "bg-amber-100 text-amber-700",
  emerald: "bg-emerald-100 text-emerald-700",
};

const ACTION_STYLE: Record<
  TodayActionKind,
  { icon: typeof Wand2; tone: string }
> = {
  prepare: { icon: Wand2, tone: "violet" },
  upload: { icon: UploadCloud, tone: "sky" },
  finish: { icon: Flag, tone: "amber" },
  scan: { icon: DownloadCloud, tone: "violet" },
  celebrate: { icon: PartyPopper, tone: "emerald" },
};

const PLATFORM_BRAND: Record<PlatformKey, { cls: string; style?: CSSProperties }> =
  {
    TIKTOK: { cls: "bg-black text-white" },
    INSTAGRAM: {
      cls: "text-white",
      style: {
        background:
          "linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)",
      },
    },
    YOUTUBE_SHORTS: { cls: "bg-[#FF0000] text-white" },
  };

export default async function TodayOpsPage() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const name = session?.name ?? null;

  const data = await getTodayOps();

  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat("es", {
      timeZone: TZ,
      hour: "numeric",
      hour12: false,
    }).format(now)
  );
  const greeting =
    hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const dateLabel = new Intl.DateTimeFormat("es", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  const pendingThings =
    data.newToPrepare + data.readyToUpload + data.partialClips;
  const headline =
    data.totalClips === 0
      ? "Conecta Drive y trae tus primeros clips para arrancar."
      : pendingThings === 0
        ? "Vas al día. Buen momento para grabar algo nuevo. 🎮"
        : "Tu misión de hoy: dejar la cola en cero. ¡Vamos! 🚀";

  const tiles = [
    {
      label: "Por preparar",
      value: data.newToPrepare,
      icon: Sparkles,
      tone: "violet",
    },
    {
      label: "Listos para subir",
      value: data.readyToUpload,
      icon: UploadCloud,
      tone: "sky",
    },
    {
      label: "Faltan por publicar",
      value: data.pendingSlots,
      icon: Clock,
      tone: "amber",
    },
    {
      label: "Publicados (7 días)",
      value: data.publishedThisWeek,
      icon: CheckCircle2,
      tone: "emerald",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6 sm:p-8">
        <div className="brand-gradient pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full opacity-20 blur-3xl" />
        <div className="relative">
          <p className="text-sm capitalize text-muted-foreground">{dateLabel}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {greeting}
            {name ? `, ${name}` : ""} 👋
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{headline}</p>
        </div>
      </div>

      {/* ── Pulso del día ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Card key={t.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                    TONE[t.tone]
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-2xl font-bold leading-none">{t.value}</p>
                  <p className="mt-1.5 text-xs font-medium text-muted-foreground">
                    {t.label}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Columna principal ── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Tu siguiente jugada */}
          <Card>
            <CardHeader>
              <CardTitle>Tu siguiente jugada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.actions.map((a, i) => {
                const style = ACTION_STYLE[a.kind];
                const Icon = style.icon;
                return (
                  <Link
                    key={a.kind}
                    href={a.href}
                    className={cn(
                      "group flex items-center gap-4 rounded-xl border p-4 transition-colors hover:bg-accent",
                      i === 0 &&
                        a.kind !== "celebrate" &&
                        "border-primary/40 bg-primary/[0.03]"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                        TONE[style.tone]
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{a.title}</p>
                        {a.count > 0 ? (
                          <Badge variant="secondary" className="shrink-0">
                            {a.count}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {a.subtitle}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          {/* Avance por red */}
          <Card>
            <CardHeader>
              <CardTitle>Avance por red</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {data.byPlatform.map((p) => {
                  const brand = PLATFORM_BRAND[p.key];
                  const done = p.pending === 0 && p.ready === 0;
                  return (
                    <Link
                      key={p.key}
                      href="/queue"
                      className="rounded-xl border p-4 transition-colors hover:bg-accent"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-md",
                            brand.cls
                          )}
                          style={brand.style}
                        >
                          <PlatformIcon
                            platform={p.key}
                            className="h-3.5 w-3.5"
                          />
                        </span>
                        <span className="text-sm font-medium">{p.label}</span>
                      </div>
                      {done ? (
                        <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" /> Al día
                        </p>
                      ) : (
                        <div className="mt-3 flex items-end gap-4">
                          <div>
                            <p className="text-2xl font-bold leading-none">
                              {p.pending}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              por preparar
                            </p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold leading-none text-sky-600">
                              {p.ready}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              listos
                            </p>
                          </div>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Columna lateral ── */}
        <div className="space-y-6">
          {/* Progreso & racha */}
          <Card>
            <CardHeader>
              <CardTitle>Tu progreso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <Streak days={data.streakDays} />
              <Weekly weekly={data.weekly} total={data.publishedThisWeek} />
              <Progress
                published={data.publishedSlots}
                total={data.totalTargetSlots}
                pct={data.progressPct}
              />
            </CardContent>
          </Card>

          {/* Recién de Drive */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Recién de Drive</CardTitle>
              <Link
                href="/clips"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Ver todos
              </Link>
            </CardHeader>
            <CardContent>
              {data.newClips.length === 0 ? (
                <EmptyState
                  title="Nada por preparar"
                  description="Todo lo de Drive ya está en proceso. 🎉"
                />
              ) : (
                <div className="space-y-1">
                  {data.newClips.map((c) => (
                    <Link
                      key={c.id}
                      href={`/clips/${c.id}`}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Film className="h-4 w-4 text-muted-foreground" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {c.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(c.durationSec)} ·{" "}
                          {clipQualityLabels[c.quality] ?? c.quality}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Streak({ days }: { days: number }) {
  const active = days > 0;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl p-4",
        active ? "brand-gradient text-white" : "bg-muted"
      )}
    >
      <Flame
        className={cn("h-8 w-8 shrink-0", active ? "text-white" : "text-muted-foreground")}
      />
      <div>
        <p className="text-2xl font-bold leading-none">
          {days} {days === 1 ? "día" : "días"}
        </p>
        <p
          className={cn(
            "mt-1 text-xs",
            active ? "text-white/80" : "text-muted-foreground"
          )}
        >
          {active
            ? "de racha publicando 🔥"
            : "Publica hoy para empezar tu racha"}
        </p>
      </div>
    </div>
  );
}

function Weekly({
  weekly,
  total,
}: {
  weekly: TodayOps["weekly"];
  total: number;
}) {
  const max = Math.max(...weekly.map((w) => w.count), 1);
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Últimos 7 días</p>
        <span className="text-xs text-muted-foreground">{total} pub.</span>
      </div>
      <div className="mt-3 flex items-end gap-1.5">
        {weekly.map((w, i) => {
          const h = w.count === 0 ? 6 : 12 + (w.count / max) * 44;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-14 w-full items-end justify-center">
                <div
                  title={`${w.count} publicado(s)`}
                  className={cn(
                    "w-full max-w-[20px] rounded",
                    w.isToday ? "brand-gradient" : "bg-muted-foreground/20"
                  )}
                  style={{ height: `${h}px` }}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] capitalize",
                  w.isToday
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {w.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Progress({
  published,
  total,
  pct,
}: {
  published: number;
  total: number;
  pct: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Destinos publicados</span>
        <span className="text-muted-foreground">
          {published}/{total}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="brand-gradient h-full rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {pct}% de tus destinos planeados ya están publicados.
      </p>
    </div>
  );
}
