import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { PLATFORM_META, PUBLISH_PLATFORMS, type PlatformKey } from "@/lib/platforms";

export type ClipWithPosts = Prisma.ClipGetPayload<{
  include: {
    posts: {
      select: { platform: true; status: true; url: true; caption: true };
    };
  };
}>;

export type QueueItem = Prisma.PostGetPayload<{
  include: { clip: { select: { id: true; title: true } } };
}>;

export type DashboardCounts = {
  clips: number;
  posts: number;
  drafts: number;
  scheduled: number;
  published: number;
  dbConnected: boolean;
};

/**
 * All read helpers below swallow connection errors and return safe
 * fallbacks so the UI still renders (with empty states) when the
 * database isn't up yet — handy on a fresh clone before the first
 * `docker compose up`.
 */

export async function getDashboardCounts(): Promise<DashboardCounts> {
  try {
    const [clips, posts, drafts, scheduled, published] = await Promise.all([
      prisma.clip.count(),
      prisma.post.count(),
      prisma.post.count({ where: { status: "DRAFT" } }),
      prisma.post.count({ where: { status: "SCHEDULED" } }),
      prisma.post.count({ where: { status: "PUBLISHED" } }),
    ]);
    return { clips, posts, drafts, scheduled, published, dbConnected: true };
  } catch {
    return {
      clips: 0,
      posts: 0,
      drafts: 0,
      scheduled: 0,
      published: 0,
      dbConnected: false,
    };
  }
}

export async function getClips(): Promise<ClipWithPosts[]> {
  try {
    return await prisma.clip.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        posts: {
          select: { platform: true, status: true, url: true, caption: true },
        },
      },
    });
  } catch {
    return [];
  }
}

export async function getQueue(): Promise<QueueItem[]> {
  try {
    return await prisma.post.findMany({
      where: { status: { in: ["DRAFT", "READY", "SCHEDULED"] } },
      orderBy: [{ plannedDate: "asc" }, { createdAt: "desc" }],
      include: { clip: { select: { id: true, title: true } } },
    });
  } catch {
    return [];
  }
}

export type ClipDetail = Prisma.ClipGetPayload<{
  include: { posts: true; edit: true };
}>;

export async function getClip(id: string): Promise<ClipDetail | null> {
  try {
    return await prisma.clip.findUnique({
      where: { id },
      include: { posts: { orderBy: { createdAt: "desc" } }, edit: true },
    });
  } catch {
    return null;
  }
}

// ─────────────────────────── Today Ops ───────────────────────────
// Cabina del día: calcula, a partir de los clips y sus posts, el flujo real de
// trabajo (preparar → subir → publicar) + racha y progreso para motivar.

const TODAY_TZ = "America/Mexico_City";

// Clave de día (YYYY-MM-DD) en la zona horaria del usuario, para que "hoy" sea
// correcto aunque el servidor corra en UTC.
function dayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TODAY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export type TodayPlatform = {
  key: PlatformKey;
  label: string;
  pending: number; // objetivo sin preparar
  ready: number; // borrador listo para subir
  published: number;
};

export type TodayActionKind =
  | "prepare"
  | "upload"
  | "finish"
  | "scan"
  | "celebrate";

export type TodayAction = {
  kind: TodayActionKind;
  title: string;
  subtitle: string;
  href: string;
  count: number;
};

export type TodayClipLite = {
  id: string;
  title: string;
  durationSec: number | null;
  quality: string;
  responsible: string | null;
};

export type TodayOps = {
  totalClips: number;
  newToPrepare: number;
  readyToUpload: number;
  pendingSlots: number;
  publishedSlots: number;
  totalTargetSlots: number;
  progressPct: number;
  partialClips: number;
  streakDays: number;
  publishedThisWeek: number;
  weekly: { label: string; count: number; isToday: boolean }[];
  byPlatform: TodayPlatform[];
  actions: TodayAction[];
  newClips: TodayClipLite[];
};

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

function emptyTodayOps(): TodayOps {
  return {
    totalClips: 0,
    newToPrepare: 0,
    readyToUpload: 0,
    pendingSlots: 0,
    publishedSlots: 0,
    totalTargetSlots: 0,
    progressPct: 0,
    partialClips: 0,
    streakDays: 0,
    publishedThisWeek: 0,
    weekly: [],
    byPlatform: PUBLISH_PLATFORMS.map((k) => ({
      key: k,
      label: PLATFORM_META[k].label,
      pending: 0,
      ready: 0,
      published: 0,
    })),
    actions: [
      {
        kind: "scan",
        title: "Trae tus clips de Drive",
        subtitle: "Aún no hay clips. Busca los nuevos para empezar.",
        href: "/clips",
        count: 0,
      },
    ],
    newClips: [],
  };
}

export async function getTodayOps(): Promise<TodayOps> {
  let clips;
  try {
    clips = await prisma.clip.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        posts: {
          select: { platform: true, status: true, publishedDate: true },
        },
      },
    });
  } catch {
    return emptyTodayOps();
  }

  if (clips.length === 0) return emptyTodayOps();

  const byPlatform = new Map<PlatformKey, TodayPlatform>(
    PUBLISH_PLATFORMS.map((k) => [
      k,
      { key: k, label: PLATFORM_META[k].label, pending: 0, ready: 0, published: 0 },
    ])
  );

  let totalTargetSlots = 0;
  let publishedSlots = 0;
  let readyToUpload = 0;
  let pendingSlots = 0;
  let newToPrepare = 0;
  let partialClips = 0;
  const newClips: TodayClipLite[] = [];
  const publishedDays: string[] = [];

  for (const c of clips) {
    const targets = new Set<string>(c.targetPlatforms);
    let clipTargets = 0;
    let clipPublished = 0;
    let clipReady = 0;

    for (const key of PUBLISH_PLATFORMS) {
      if (!targets.has(key)) continue;
      clipTargets++;
      totalTargetSlots++;
      const post = c.posts.find((p) => p.platform === key);
      const bp = byPlatform.get(key)!;
      if (post?.status === "PUBLISHED") {
        publishedSlots++;
        clipPublished++;
        bp.published++;
      } else if (post?.status === "DRAFT" || post?.status === "READY") {
        readyToUpload++;
        clipReady++;
        bp.ready++;
      } else {
        pendingSlots++;
        bp.pending++;
      }
    }

    if (clipTargets > 0 && clipPublished > 0 && clipPublished < clipTargets) {
      partialClips++;
    }
    // "Sin preparar": ningún destino publicado ni en borrador.
    if (clipPublished === 0 && clipReady === 0) {
      newToPrepare++;
      if (newClips.length < 5) {
        newClips.push({
          id: c.id,
          title: c.title,
          durationSec: c.duration,
          quality: c.quality,
          responsible: c.responsible,
        });
      }
    }

    for (const p of c.posts) {
      if (p.status === "PUBLISHED" && p.publishedDate) {
        publishedDays.push(dayKey(p.publishedDate));
      }
    }
  }

  // Racha: días consecutivos con ≥1 publicación, terminando hoy (o ayer, para
  // no romperla solo porque aún no has publicado hoy).
  const daySet = new Set(publishedDays);
  let streakDays = 0;
  let cursor = new Date();
  if (!daySet.has(dayKey(cursor))) {
    cursor = new Date(cursor.getTime() - 86_400_000);
  }
  while (daySet.has(dayKey(cursor))) {
    streakDays++;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }

  // Minigráfica de los últimos 7 días.
  const todayK = dayKey(new Date());
  const weekly: TodayOps["weekly"] = [];
  let publishedThisWeek = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const k = dayKey(d);
    const count = publishedDays.filter((x) => x === k).length;
    publishedThisWeek += count;
    weekly.push({
      label: new Intl.DateTimeFormat("es", {
        timeZone: TODAY_TZ,
        weekday: "short",
      })
        .format(d)
        .replace(".", ""),
      count,
      isToday: k === todayK,
    });
  }

  const progressPct =
    totalTargetSlots > 0
      ? Math.round((publishedSlots / totalTargetSlots) * 100)
      : 0;

  // Acciones priorizadas: "tu siguiente jugada".
  const actions: TodayAction[] = [];
  if (newToPrepare > 0) {
    actions.push({
      kind: "prepare",
      count: newToPrepare,
      title: `Prepara ${newToPrepare} ${plural(newToPrepare, "clip nuevo", "clips nuevos")}`,
      subtitle: "Recién de Drive: ponles destino, caption y hashtags.",
      href: "/clips",
    });
  }
  if (readyToUpload > 0) {
    actions.push({
      kind: "upload",
      count: readyToUpload,
      title: `Sube ${readyToUpload} ${plural(readyToUpload, "borrador listo", "borradores listos")}`,
      subtitle: "Ya tienen caption y hashtags — solo falta el clic de subir.",
      href: "/queue",
    });
  }
  if (partialClips > 0) {
    actions.push({
      kind: "finish",
      count: partialClips,
      title: `Termina ${partialClips} ${plural(partialClips, "clip a medias", "clips a medias")}`,
      subtitle: "Publicados en una red, faltan las demás.",
      href: "/clips",
    });
  }
  if (actions.length === 0) {
    actions.push({
      kind: "celebrate",
      count: 0,
      title: "¡Todo al día!",
      subtitle: "No hay nada pendiente por preparar ni subir. A grabar algo nuevo. 🎮",
      href: "/clips",
    });
  }

  return {
    totalClips: clips.length,
    newToPrepare,
    readyToUpload,
    pendingSlots,
    publishedSlots,
    totalTargetSlots,
    progressPct,
    partialClips,
    streakDays,
    publishedThisWeek,
    weekly,
    byPlatform: Array.from(byPlatform.values()),
    actions,
    newClips,
  };
}

// Banco global de hashtags personalizados (se sugieren en todos los clips).
export async function getCustomHashtags(): Promise<string[]> {
  try {
    const rows = await prisma.hashtag.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map((r) => r.tag);
  } catch {
    return [];
  }
}
