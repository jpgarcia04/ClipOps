import { ListVideo, Plus } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { QueueItemRow } from "@/components/posts/queue-item-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getQueue } from "@/lib/data";
import { postStatusLabels } from "@/lib/display";

export const dynamic = "force-dynamic";

const COLUMNS: { key: "DRAFT" | "READY" | "SCHEDULED" }[] = [
  { key: "DRAFT" },
  { key: "READY" },
  { key: "SCHEDULED" },
];

export default async function QueuePage() {
  const queue = await getQueue();

  return (
    <div>
      <PageHeader
        title="Cola de publicación"
        description="Posts en preparación, listos y agendados, agrupados por estado."
        action={
          <Button disabled>
            <Plus className="h-4 w-4" /> Nuevo post
          </Button>
        }
      />

      {queue.length === 0 ? (
        <EmptyState
          icon={<ListVideo className="h-8 w-8" />}
          title="La cola está vacía"
          description="Cada publicación de un clip en una plataforma vive aquí hasta publicarse."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {COLUMNS.map((col) => {
            const items = queue.filter((p) => p.status === col.key);
            return (
              <Card key={col.key}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">
                    {postStatusLabels[col.key]}
                  </CardTitle>
                  <Badge variant="secondary">{items.length}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Sin elementos.
                    </p>
                  ) : (
                    items.map((p) => <QueueItemRow key={p.id} post={p} />)
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
