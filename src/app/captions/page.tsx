import { Hash, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const hashtagSets = [
  { name: "Genéricos", tags: ["#reels", "#viral", "#fyp", "#contentcreator"] },
  { name: "Negocio", tags: ["#emprendimiento", "#marketing", "#negocios"] },
  { name: "Tutorial", tags: ["#tutorial", "#tips", "#aprende", "#howto"] },
];

export default function CaptionsPage() {
  return (
    <div>
      <PageHeader
        title="Captions & Hashtags"
        description="Banco de copys y sets de hashtags reutilizables para tus posts."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Plantillas de caption
            </CardTitle>
            <CardDescription>
              Estructuras base para escribir más rápido.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="rounded-md border p-3">
              Hook fuerte → contexto → CTA. Ej: “Esto cambió cómo edito mis
              videos 👇 …”
            </p>
            <p className="rounded-md border p-3">
              Pregunta → respuesta corta → invitación a comentar.
            </p>
            <p className="rounded-md border p-3">
              Resultado/beneficio primero → cómo lo lograste → cierre.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-4 w-4" /> Sets de hashtags
            </CardTitle>
            <CardDescription>
              Agrupa hashtags por tema y reúsalos en cada post.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hashtagSets.map((set) => (
              <div key={set.name}>
                <p className="mb-2 text-sm font-medium">{set.name}</p>
                <div className="flex flex-wrap gap-2">
                  {set.tags.map((t) => (
                    <Badge key={t} variant="secondary">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
