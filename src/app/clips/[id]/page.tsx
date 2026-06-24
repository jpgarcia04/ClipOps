import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, ExternalLink, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getClip, getCustomHashtags } from "@/lib/data";
import {
  clipQualityLabels,
  clipStatusLabels,
  clipStatusVariant,
  clipTypeLabels,
  formatDuration,
} from "@/lib/display";
import { PLATFORM_META, PUBLISH_PLATFORMS } from "@/lib/platforms";
import { getSuggestions } from "@/lib/suggestions";
import { ClipPreview } from "./clip-preview";
import { ClipTitle } from "./clip-title";
import { PublishFlow } from "./publish-flow";

export const dynamic = "force-dynamic";

export default async function ClipDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const clip = await getClip(params.id);
  if (!clip) notFound();

  const suggestions = getSuggestions({ title: clip.title, tags: clip.tags });
  const customHashtags = await getCustomHashtags();
  const hashtags = Array.from(
    new Set([...suggestions.hashtags, ...customHashtags])
  );

  const postByPlatform = new Map<string, (typeof clip.posts)[number]>();
  for (const post of clip.posts) {
    if (!postByPlatform.has(post.platform)) postByPlatform.set(post.platform, post);
  }
  const targetSet = new Set<string>(clip.targetPlatforms);

  const platforms = PUBLISH_PLATFORMS.map((key) => {
    const post = postByPlatform.get(key);
    const status =
      post?.status === "PUBLISHED"
        ? ("published" as const)
        : post?.status === "DRAFT" || post?.status === "READY"
          ? ("draft" as const)
          : ("pending" as const);
    return {
      key,
      label: PLATFORM_META[key].label,
      uploadUrl: PLATFORM_META[key].uploadUrl,
      uploadLabel: PLATFORM_META[key].uploadLabel,
      isTarget: targetSet.has(key),
      status,
      url: post?.url ?? null,
      draftCaption: status === "draft" ? post?.caption ?? "" : null,
      draftHashtags: status === "draft" ? post?.hashtags ?? [] : null,
    };
  });

  // Borrador guardado (si lo hay): restauramos esas elecciones en el editor.
  const draftPost = clip.posts.find(
    (p) => p.status === "DRAFT" || p.status === "READY"
  );
  const savedDraft = draftPost
    ? { caption: draftPost.caption, hashtags: draftPost.hashtags }
    : null;

  return (
    <div>
      <Link
        href="/clips"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Clips
      </Link>

      <div className="mb-6 rounded-lg border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <ClipTitle clipId={clip.id} initialTitle={clip.title} />
              <Badge variant={clipStatusVariant(clip.status)}>
                {clipStatusLabels[clip.status] ?? clip.status}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{clipTypeLabels[clip.type] ?? clip.type}</span>
              <span>{clipQualityLabels[clip.quality] ?? clip.quality}</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {formatDuration(clip.duration)}
              </span>
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" /> {clip.responsible ?? "Sin asignar"}
              </span>
            </div>
            {clip.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {clip.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ClipPreview clipId={clip.id} />
            <a
              href={clip.driveLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
            >
              Abrir en Drive <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      <PublishFlow
        clipId={clip.id}
        driveLink={clip.driveLink}
        captions={suggestions.captions}
        hashtags={hashtags}
        platforms={platforms}
        savedDraft={savedDraft}
      />
    </div>
  );
}
