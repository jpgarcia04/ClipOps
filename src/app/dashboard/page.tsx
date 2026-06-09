import Link from "next/link";
import { ArrowRight, Database, Film, ListVideo, Send } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardCounts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const counts = await getDashboardCounts();

  const stats = [
    { label: "Clips", value: counts.clips, href: "/clips", icon: Film },
    {
      label: "Posts en cola",
      value: counts.drafts + counts.scheduled,
      href: "/queue",
      icon: ListVideo,
    },
    {
      label: "Publicados",
      value: counts.published,
      href: "/metrics",
      icon: Send,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Vista general de ClipOps."
        action={
          <Badge
            variant={counts.dbConnected ? "secondary" : "destructive"}
            className="gap-1"
          >
            <Database className="h-3 w-3" />
            {counts.dbConnected ? "DB conectada" : "DB sin conexión"}
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <CardContent className="flex items-end justify-between">
                <div className="text-3xl font-bold">{s.value}</div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={s.href}>
                    Ver <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!counts.dbConnected ? (
        <Card className="mt-6 border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">
              La base de datos no está disponible
            </CardTitle>
            <CardDescription>
              Levanta Postgres con{" "}
              <code className="font-mono">docker compose up</code> o configura{" "}
              <code className="font-mono">DATABASE_URL</code> en tu archivo{" "}
              <code className="font-mono">.env</code>.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </div>
  );
}
