import { Hash, Sparkles } from "lucide-react";

import { CopyButton, CopyChip } from "@/components/copy";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Placeholders temáticos de EA FC. Más adelante esto se vuelve editable y
// por-clip; por ahora es un banco fijo listo para copiar y pegar.
const captionTemplates = [
  {
    title: "Golazo / highlight",
    text: "🚨 ESTO es lo que pasa cuando confías en Mbappé en el minuto 90… guárdalo para tu próxima FUT Champions 🔥",
  },
  {
    title: "Remontada",
    text: "POV: vas perdiendo 3-0 y no te rindes 😤 La remontada MÁS épica que vas a ver hoy 👇",
  },
  {
    title: "Skills / tutorial",
    text: "5 skills que casi nadie usa bien (el #3 es ilegal) 🧠⚽ ¿cuál vas a practicar?",
  },
  {
    title: "Bug / humor",
    text: "El portero dijo 'hoy no' y salió volando 😂 EA FC nunca decepciona 🤣",
  },
];

const hashtagSets = [
  {
    name: "Generales EA FC",
    tags: ["#eafc25", "#fc25", "#futchampions", "#ultimateteam", "#fyp", "#parati"],
  },
  {
    name: "Golazos",
    tags: ["#golazo", "#goal", "#screamer", "#worldie", "#football"],
  },
  {
    name: "Skills / tutorial",
    tags: ["#skills", "#skillmoves", "#tutorial", "#tips", "#gaming"],
  },
  {
    name: "Humor / fails",
    tags: ["#fail", "#bug", "#funny", "#gaming", "#lol"],
  },
];

export default function CaptionsPage() {
  return (
    <div>
      <PageHeader
        title="Captions & Hashtags"
        description="Banco de copys y hashtags: toca copiar y pega en cada red. (Placeholders por ahora.)"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Captions
            </CardTitle>
            <CardDescription>
              Cada caption tiene su botón de copiar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {captionTemplates.map((c) => (
              <div key={c.title} className="rounded-md border p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    {c.title}
                  </span>
                  <CopyButton value={c.text} />
                </div>
                <p className="text-sm">{c.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-4 w-4" /> Hashtags
            </CardTitle>
            <CardDescription>
              Toca un hashtag para copiarlo, o copia el set completo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hashtagSets.map((set) => (
              <div key={set.name} className="rounded-md border p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{set.name}</span>
                  <CopyButton value={set.tags.join(" ")} label="Copiar todos" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {set.tags.map((t) => (
                    <CopyChip key={t} value={t} />
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
