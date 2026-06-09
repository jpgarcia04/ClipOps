import { CalendarCheck, CheckCircle2, Film, Send } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { QueueItemRow } from "@/components/posts/queue-item-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardCounts, getQueue } from "@/lib/data";

export const dynamic = "force-dynamic";

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default async function TodayOpsPage() {
  const [queue, counts] = await Promise.all([getQueue(), getDashboardCounts()]);
  const now = new Date();

  const todays = queue.filter(
    (p) => p.plannedDate && isSameDay(new Date(p.plannedDate), now)
  );
  const overdue = queue.filter(
    (p) =>
      p.plannedDate &&
      new Date(p.plannedDate) < now &&
      !isSameDay(new Date(p.plannedDate), now)
  );

  const stats = [
    { label: "Para hoy", value: todays.length, icon: CalendarCheck },
    { label: "Atrasados", value: overdue.length, icon: Send },
    { label: "Clips activos", value: counts.clips, icon: Film },
    { label: "Publicados", value: counts.published, icon: CheckCircle2 },
  ];

  return (
    <div>
      <PageHeader
        title="Today Ops"
        description="Lo que toca ejecutar hoy: publicaciones planeadas y pendientes."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {s.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Publicaciones de hoy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todays.length === 0 ? (
              <EmptyState
                title="Nada planeado para hoy"
                description="Cuando agendes posts con fecha de hoy aparecerán aquí."
              />
            ) : (
              todays.map((p) => <QueueItemRow key={p.id} post={p} />)
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atrasados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overdue.length === 0 ? (
              <EmptyState
                title="Sin pendientes atrasados"
                description="Vas al día. 🎉"
              />
            ) : (
              overdue.map((p) => <QueueItemRow key={p.id} post={p} />)
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
