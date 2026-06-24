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
    const targets = new Set<string>(c.targetPlatforms);

    const platforms = PUBLISH_PLATFORMS.map((key) => {
      const post = c.posts.find((p) => p.platform === key);
      const isTarget = targets.has(key);
      const state =
        post?.status === "PUBLISHED"
          ? ("published" as const)
          : !isTarget
            ? ("off" as const)
            : post?.status === "DRAFT" || post?.status === "READY"
              ? ("draft" as const)
              : ("pending" as const);
      return {
        key,
        label: PLATFORM_META[key].label,
        state,
        url: post?.url ?? null,
      };
    });

    const targetCount = platforms.filter((p) => p.state !== "off").length;
    const publishedCount = platforms.filter(
      (p) => p.state === "published"
    ).length;
    const draftCount = platforms.filter((p) => p.state === "draft").length;

    const pubStatus =
      publishedCount > 0 && publishedCount >= targetCount
        ? ("complete" as const)
        : publishedCount > 0
          ? ("partial" as const)
          : draftCount > 0
            ? ("draft" as const)
            : ("none" as const);

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
