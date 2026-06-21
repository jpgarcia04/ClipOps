import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export type ClipWithPosts = Prisma.ClipGetPayload<{
  include: { posts: { select: { platform: true; status: true; url: true } } };
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
        posts: { select: { platform: true, status: true, url: true } },
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

export type ClipDetail = Prisma.ClipGetPayload<{ include: { posts: true } }>;

export async function getClip(id: string): Promise<ClipDetail | null> {
  try {
    return await prisma.clip.findUnique({
      where: { id },
      include: { posts: { orderBy: { createdAt: "desc" } } },
    });
  } catch {
    return null;
  }
}
