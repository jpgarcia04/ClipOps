"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Loader2 } from "lucide-react";

import { CopyButton } from "@/components/copy";
import { PlatformIcon } from "@/components/platform-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type PlatformState = {
  key: "TIKTOK" | "INSTAGRAM" | "YOUTUBE_SHORTS";
  label: string;
  uploadUrl: string;
  uploadLabel: string;
  published: boolean;
  url: string | null;
};

const BRAND: Record<
  PlatformState["key"],
  { className: string; style?: React.CSSProperties }
> = {
  TIKTOK: { className: "bg-black text-white hover:bg-black/90" },
  INSTAGRAM: {
    className: "text-white hover:opacity-90",
    style: {
      background:
        "linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)",
    },
  },
  YOUTUBE_SHORTS: { className: "bg-[#FF0000] text-white hover:bg-[#FF0000]/90" },
};

export function PublishFlow({
  clipId,
  driveLink,
  captions,
  hashtags,
  platforms,
}: {
  clipId: string;
  driveLink: string;
  captions: string[];
  hashtags: string[];
  platforms: PlatformState[];
}) {
  const router = useRouter();
  const [selectedCaption, setSelectedCaption] = React.useState(
    captions[0] ?? ""
  );
  const [selectedTags, setSelectedTags] = React.useState<string[]>(hashtags);
  const [flash, setFlash] = React.useState<string | null>(null);
  const [dialogPlatform, setDialogPlatform] =
    React.useState<PlatformState | null>(null);

  const copyText = `${selectedCaption}\n\n${selectedTags.join(" ")}`.trim();

  const toggleTag = (t: string) =>
    setSelectedTags((cur) =>
      cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]
    );

  const showFlash = (m: string) => {
    setFlash(m);
    window.setTimeout(() => setFlash(null), 2600);
  };

  const openPlatform = async (p: PlatformState) => {
    try {
      await navigator.clipboard.writeText(copyText);
    } catch {
      /* clipboard puede fallar sin https; no bloquea el flujo */
    }
    window.open(p.uploadUrl, "_blank", "noopener,noreferrer");
    window.open(driveLink, "_blank", "noopener,noreferrer");
    showFlash(`Copiado: caption + ${selectedTags.length} hashtags · abriendo ${p.label}…`);
  };

  const done = platforms.filter((p) => p.published);
  const pending = platforms.filter((p) => !p.published);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* ── Elige el copy ── */}
      <div className="space-y-6">
        <section className="rounded-lg border bg-card p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Captions sugeridas</h2>
            <span className="text-xs text-muted-foreground">Elige una</span>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Basadas en el nombre del clip. Toca para elegir; el botón copia.
          </p>
          <div className="space-y-2.5">
            {captions.map((c) => {
              const active = c === selectedCaption;
              return (
                <div
                  key={c}
                  className={cn(
                    "flex items-start gap-3 rounded-md border p-3 text-sm transition-colors",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:bg-accent"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedCaption(c)}
                    className="flex flex-1 items-start gap-3 text-left"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40"
                      )}
                    >
                      {active ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <span className="flex-1">{c}</span>
                  </button>
                  <CopyButton value={c} />
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border bg-card p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Hashtags sugeridos</h2>
            <span className="text-xs text-muted-foreground">
              {selectedTags.length}/{hashtags.length} elegidos
            </span>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Toca para activar o desactivar cada uno.
          </p>
          <div className="flex flex-wrap gap-2">
            {hashtags.map((t) => {
              const active = selectedTags.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTag(t)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input text-muted-foreground hover:bg-accent"
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <CopyButton
              value={selectedTags.join(" ")}
              label={`Copiar elegidos (${selectedTags.length})`}
            />
            <CopyButton value={hashtags.join(" ")} label="Copiar todos" />
          </div>
        </section>
      </div>

      {/* ── Publica en cada red ── */}
      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <section className="rounded-lg border bg-card p-5">
          <h2 className="text-sm font-semibold">Publica en cada red</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            «Abrir» copia el copy y abre el uploader + el video en Drive.
          </p>

          <div className="space-y-3">
            {platforms.map((p) => (
              <div
                key={p.key}
                className={cn(
                  "rounded-lg border p-3",
                  p.published && "bg-muted/40"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                    <PlatformIcon platform={p.key} className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-tight">
                      {p.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.uploadLabel}
                    </p>
                  </div>
                  {p.published ? (
                    <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
                      <Check className="h-3 w-3" /> Publicado
                    </Badge>
                  ) : null}
                </div>

                {p.published ? (
                  p.url ? (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Ver publicación <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      className={BRAND[p.key].className}
                      style={BRAND[p.key].style}
                      onClick={() => openPlatform(p)}
                    >
                      <PlatformIcon platform={p.key} className="h-4 w-4" /> Abrir
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDialogPlatform(p)}
                    >
                      Marcar publicado
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {done.length > 0 && pending.length > 0 ? (
            <p className="mt-4 rounded-md bg-muted/60 p-2.5 text-xs text-muted-foreground">
              ✅ Ya en {done.map((d) => d.label).join(", ")}. Repost disponible:{" "}
              <span className="font-medium text-foreground">
                {pending.map((p) => p.label).join(", ")}
              </span>
              .
            </p>
          ) : null}

          <div className="mt-4 border-t pt-3">
            <a
              href={driveLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Abrir video en Drive <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </section>

        {flash ? (
          <div className="rounded-md border bg-card p-3 text-xs text-muted-foreground shadow-sm">
            {flash}
          </div>
        ) : null}
      </div>

      {dialogPlatform ? (
        <PublishDialog
          key={dialogPlatform.key}
          open={!!dialogPlatform}
          onOpenChange={(o) => {
            if (!o) setDialogPlatform(null);
          }}
          clipId={clipId}
          platform={dialogPlatform}
          suggestedCaptions={captions}
          defaultCaption={selectedCaption}
          suggestedHashtags={hashtags}
          defaultTags={selectedTags}
          onDone={() => {
            setDialogPlatform(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function PublishDialog({
  open,
  onOpenChange,
  clipId,
  platform,
  suggestedCaptions,
  defaultCaption,
  suggestedHashtags,
  defaultTags,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clipId: string;
  platform: PlatformState;
  suggestedCaptions: string[];
  defaultCaption: string;
  suggestedHashtags: string[];
  defaultTags: string[];
  onDone: () => void;
}) {
  const [useOther, setUseOther] = React.useState(false);
  const [caption, setCaption] = React.useState(defaultCaption);
  const [otherCaption, setOtherCaption] = React.useState("");
  const [tags, setTags] = React.useState<string[]>(defaultTags);
  const [otherTags, setOtherTags] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const toggle = (t: string) =>
    setTags((c) => (c.includes(t) ? c.filter((x) => x !== t) : [...c, t]));

  const submit = async () => {
    if (!url.trim()) {
      setError("La URL del post es obligatoria.");
      return;
    }
    setSaving(true);
    setError(null);

    const extra = otherTags
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith("#") ? t : `#${t}`));
    const finalTags = Array.from(new Set([...tags, ...extra]));
    const finalCaption = useOther ? otherCaption : caption;

    try {
      const res = await fetch("/api/posts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clipId,
          platform: platform.key,
          caption: finalCaption,
          hashtags: finalTags,
          url: url.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      onDone();
    } catch {
      setError("No se pudo guardar. Intenta de nuevo.");
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Marcar publicado en {platform.label}</DialogTitle>
          <DialogDescription>
            Registra lo que usaste de verdad — así la app aprende qué funciona.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-2">
            <Label>¿Qué caption usaste?</Label>
            <div className="space-y-1.5">
              {suggestedCaptions.map((c) => {
                const active = !useOther && caption === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setUseOther(false);
                      setCaption(c);
                    }}
                    className={cn(
                      "block w-full rounded-md border p-2.5 text-left text-sm transition-colors",
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "hover:bg-accent"
                    )}
                  >
                    {c}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setUseOther(true)}
                className={cn(
                  "block w-full rounded-md border p-2.5 text-left text-sm transition-colors",
                  useOther
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "hover:bg-accent"
                )}
              >
                Otra (escribir)
              </button>
              {useOther ? (
                <Textarea
                  value={otherCaption}
                  onChange={(e) => setOtherCaption(e.target.value)}
                  placeholder="Pega o escribe la caption que usaste (opcional)"
                />
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label>¿Qué hashtags usaste?</Label>
            <div className="flex flex-wrap gap-2">
              {suggestedHashtags.map((t) => {
                const active = tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggle(t)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            <Input
              value={otherTags}
              onChange={(e) => setOtherTags(e.target.value)}
              placeholder="Otros hashtags (opcional), separados por espacio"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="post-url">
              URL del post publicado{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="post-url"
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving || !url.trim()}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Guardar como publicado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
