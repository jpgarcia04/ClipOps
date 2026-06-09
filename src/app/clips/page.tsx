import { ExternalLink, Film, Plus } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getClips } from "@/lib/data";
import {
  clipQualityLabels,
  clipStatusLabels,
  clipStatusVariant,
  clipTypeLabels,
  formatDuration,
} from "@/lib/display";

export const dynamic = "force-dynamic";

export default async function ClipsPage() {
  const clips = await getClips();

  return (
    <div>
      <PageHeader
        title="Clips"
        description="Tus videos base. De aquí salen todas las publicaciones."
        action={
          <Button disabled>
            <Plus className="h-4 w-4" /> Nuevo clip
          </Button>
        }
      />

      {clips.length === 0 ? (
        <EmptyState
          icon={<Film className="h-8 w-8" />}
          title="Aún no hay clips"
          description="Crea tu primer clip o usa `npm run db:studio` para cargar datos de prueba."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Calidad</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Posts</TableHead>
                  <TableHead className="text-right">Drive</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clips.map((clip) => (
                  <TableRow key={clip.id}>
                    <TableCell className="font-medium">{clip.title}</TableCell>
                    <TableCell>
                      <Badge variant={clipStatusVariant(clip.status)}>
                        {clipStatusLabels[clip.status] ?? clip.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {clipTypeLabels[clip.type] ?? clip.type}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {clipQualityLabels[clip.quality] ?? clip.quality}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDuration(clip.duration)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {clip.responsible ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {clip._count.posts}
                    </TableCell>
                    <TableCell className="text-right">
                      <a
                        href={clip.driveLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        Abrir <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
