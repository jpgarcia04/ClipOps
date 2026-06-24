import { PageHeader } from "@/components/layout/page-header";
import { getClips } from "@/lib/data";
import { PLATFORM_META, PUBLISH_PLATFORMS } from "@/lib/platforms";
import { QueueBoard, type QueueColumn, type QueueItem } from "./queue-board";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const clips = await getClips();

  const columns: QueueColumn[] = PUBLISH_PLATFORMS.map((key) => {
    const items = clips.flatMap((c): QueueItem[] => {
      const post = c.posts.find((p) => p.platform === key);
      if (post?.status === "PUBLISHED") return []; // ya subido aquí
      if (!c.targetPlatforms.includes(key)) return []; // no es objetivo
      const isDraft = post?.status === "DRAFT" || post?.status === "READY";
      return [
        {
          id: c.id,
          title: c.title,
          durationSec: c.duration,
          quality: c.quality,
          isDraft,
          caption: post?.caption ?? null,
        },
      ];
    });
    // Los borradores listos van primero.
    items.sort((a, b) => Number(b.isDraft) - Number(a.isDraft));
    return { key, label: PLATFORM_META[key].label, items };
  });

  return (
    <div>
      <PageHeader
        title="Cola de publicación"
        description="Lo que falta por subir, por red. Los borradores listos van primero."
      />
      <QueueBoard columns={columns} />
    </div>
  );
}
