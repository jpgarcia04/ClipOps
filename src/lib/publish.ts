import type { Platform } from "@prisma/client";

import { prisma } from "@/lib/db";

// Registra (o actualiza) la publicación de un clip en una plataforma y marca
// el clip como publicado. Un Post se crea cuando se publica de verdad —
// "lo que falta" se calcula como targetPlatforms − plataformas publicadas.
export async function publishClipToPlatform(input: {
  clipId: string;
  platform: Platform;
  caption?: string | null;
  hashtags?: string[];
  url: string;
}) {
  const { clipId, platform, caption, hashtags = [], url } = input;

  const existing = await prisma.post.findFirst({ where: { clipId, platform } });

  const data = {
    status: "PUBLISHED" as const,
    caption: caption ?? null,
    hashtags,
    url,
    publishedDate: new Date(),
  };

  const post = existing
    ? await prisma.post.update({ where: { id: existing.id }, data })
    : await prisma.post.create({ data: { clipId, platform, ...data } });

  // El clip tiene ≥1 publicación → queda como Publicado.
  await prisma.clip.update({
    where: { id: clipId },
    data: { status: "PUBLISHED" },
  });

  return post;
}
