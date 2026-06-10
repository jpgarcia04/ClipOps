import Link from "next/link";
import { ExternalLink, Film } from "lucide-react";

import { ScanDriveButton } from "@/components/clips/scan-drive-button";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
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
        description="Tus videos base desde Google Drive. Busca los nuevos y organízalos."
        action={<ScanDriveButton />}
      />

      {clips.length === 0 ? (
        <EmptyState
          icon={<Film className="h-8 w-8" />}
          title="Aún no hay clips"
          description="Toca «Buscar en Drive» para traer los clips nuevos como pendientes."
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
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/clips/${clip.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {clip.title}
                        </Link>
                        {clip._count.posts === 0 ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase"
                          >
                            nuevo
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
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
