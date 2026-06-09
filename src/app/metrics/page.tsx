import { BarChart3, Eye, Send, ThumbsUp } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardCounts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function MetricsPage() {
  const counts = await getDashboardCounts();

  const cards = [
    { label: "Posts publicados", value: counts.published, icon: Send },
    { label: "Agendados", value: counts.scheduled, icon: BarChart3 },
    { label: "Borradores", value: counts.drafts, icon: Eye },
    { label: "Clips totales", value: counts.clips, icon: ThumbsUp },
  ];

  return (
    <div>
      <PageHeader
        title="Métricas"
        description="Resumen de actividad. Las analíticas por plataforma llegan después."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {c.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{c.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Vistas, likes y engagement</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<BarChart3 className="h-8 w-8" />}
            title="Métricas por plataforma próximamente"
            description="Aquí se integrarán las analíticas de cada publicación (vistas, likes, comentarios)."
          />
        </CardContent>
      </Card>
    </div>
  );
}
