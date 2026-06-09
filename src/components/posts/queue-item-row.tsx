import { Badge } from "@/components/ui/badge";
import type { QueueItem } from "@/lib/data";
import {
  formatDate,
  platformLabels,
  postStatusLabels,
  postStatusVariant,
} from "@/lib/display";

export function QueueItemRow({ post }: { post: QueueItem }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{post.clip.title}</p>
        <p className="text-xs text-muted-foreground">
          {platformLabels[post.platform] ?? post.platform}
          {post.plannedDate ? ` · ${formatDate(post.plannedDate)}` : ""}
        </p>
      </div>
      <Badge variant={postStatusVariant(post.status)}>
        {postStatusLabels[post.status] ?? post.status}
      </Badge>
    </div>
  );
}
