import { Film } from "lucide-react";

import { ScanDriveButton } from "@/components/clips/scan-drive-button";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { getClips } from "@/lib/data";
import { PLATFORM_META, PUBLISH_PLATFORMS } from "@/lib/platforms";
import { ClipsTable, type ClipRowVM } from "./clips-table";

export const dynamic = "force-dynamic";

export default async function ClipsPage() {
  const clips = await getClips();

  const rows: ClipRowVM[] = clips.map((c) => {
    const publishedUrl = new Map<string, string | null>();
    for (const p of c.posts) {
      if (p.status === "PUBLISHED") publishedUrl.set(p.platform, p.url);
    }
    const targets = new Set<string>(c.targetPlatforms);

    const platforms = PUBLISH_PLATFORMS.map((key) => ({
      key,
      label: PLATFORM_META[key].label,
      state: publishedUrl.has(key)
        ? ("published" as const)
        : targets.has(key)
          ? ("pending" as const)
          : ("off" as const),
      url: publishedUrl.get(key) ?? null,
    }));

    const targetCount = platforms.filter((p) => p.state !== "off").length;
    const publishedCount = platforms.filter(
      (p) => p.state === "published"
    ).length;
    const pubStatus =
      publishedCount === 0
        ? ("none" as const)
        : publishedCount >= targetCount && targetCount > 0
          ? ("complete" as const)
          : ("partial" as const);

    return {
      id: c.id,
      title: c.title,
      durationSec: c.duration,
      quality: c.quality,
      responsible: c.responsible,
      isNew: c.posts.length === 0,
      thumbnailUrl: c.thumbnailUrl,
      platforms,
      targetCount,
      publishedCount,
      pubStatus,
    };
  });

  return (
    <div>
      <PageHeader
        title="Clips"
        description="Tus videos base desde Google Drive. Busca los nuevos y publícalos."
        action={<ScanDriveButton />}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Film className="h-8 w-8" />}
          title="Aún no hay clips"
          description="Toca «Buscar en Drive» para traer los clips nuevos como pendientes."
        />
      ) : (
        <ClipsTable clips={rows} />
      )}
    </div>
  );
}
