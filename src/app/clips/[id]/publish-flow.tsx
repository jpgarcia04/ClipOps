"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ExternalLink,
  Loader2,
  Plus,
  Save,
} from "lucide-react";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type PlatformKey = "TIKTOK" | "INSTAGRAM" | "YOUTUBE_SHORTS";
type PlatformStatus = "published" | "draft" | "pending";

type PlatformState = {
  key: PlatformKey;
  label: string;
  uploadUrl: string;
  uploadLabel: string;
  isTarget: boolean;
  status: PlatformStatus;
  url: string | null;
  draftCaption: string | null;
  draftHashtags: string[] | null;
};

const BRAND: Record<PlatformKey, { className: string; style?: React.CSSProperties }> = {
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

function normalizeTag(input: string) {
  const clean = input
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, "")
    .toLowerCase();
  return clean ? `#${clean}` : "";
}

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
  const [allCaptions, setAllCaptions] = React.useState<string[]>(captions);
  const [selectedCaption, setSelectedCaption] = React.useState(
    captions[0] ?? ""
  );
  const [allTags, setAllTags] = React.useState<string[]>(hashtags);
  const [selectedTags, setSelectedTags] = React.useState<string[]>(hashtags);

  const [addingCaption, setAddingCaption] = React.useState(false);
  const [newCaption, setNewCaption] = React.useState("");
  const [newTag, setNewTag] = React.useState("");

  const [flash, setFlash] = React.useState<string | null>(null);
  const [savingDraft, setSavingDraft] = React.useState(false);
  const [dialogPlatform, setDialogPlatform] =
    React.useState<PlatformState | null>(null);

  const [targets, setTargets] = React.useState<Set<PlatformKey>>(
    () =>
      new Set(
        platforms
          .filter((p) => p.isTarget || p.status === "published")
          .map((p) => p.key)
      )
  );

  const showFlash = (m: string) => {
    setFlash(m);
    window.setTimeout(() => setFlash(null), 2800);
  };

  const toggleTag = (t: string) =>
    setSelectedTags((cur) =>
      cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]
    );

  const addCaption = () => {
    const c = newCaption.trim();
    if (!c) return;
    setAllCaptions((p) => (p.includes(c) ? p : [...p, c]));
    setSelectedCaption(c);
    setNewCaption("");
    setAddingCaption(false);
  };

  // Hashtag nuevo → se añade localmente y se guarda en el banco global.
  const addHashtag = async () => {
    const tag = normalizeTag(newTag);
    setNewTag("");
    if (!tag) return;
    setSelectedTags((p) => (p.includes(tag) ? p : [...p, tag]));
    if (allTags.includes(tag)) return;
    setAllTags((p) => [...p, tag]);
    try {
      await fetch("/api/hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag }),
      });
      showFlash(`${tag} añadido (queda para todos los clips)`);
    } catch {
      /* queda añadido localmente aunque falle el guardado */
    }
  };

  const toggleTarget = async (key: PlatformKey) => {
    const p = platforms.find((x) => x.key === key);
    if (p?.status === "published") return; // publicado: bloqueado

    const next = new Set(targets);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setTargets(next);

    try {
      await fetch("/api/clips/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clipId, platforms: Array.from(next) }),
      });
      showFlash("Redes objetivo actualizadas");
      router.refresh();
    } catch {
      showFlash("No se pudo guardar el cambio");
    }
  };

  const visible = platforms.filter(
    (p) => targets.has(p.key) || p.status === "published"
  );
  const draftable = visible.filter((p) => p.status !== "published");
  const done = visible.filter((p) => p.status === "published");
  const pending = visible.filter((p) => p.status !== "published");

  const saveDraft = async (keys: PlatformKey[]) => {
    if (keys.length === 0) return;
    setSavingDraft(true);
    try {
      const res = await fetch("/api/posts/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clipId,
          platforms: keys,
          caption: selectedCaption,
          hashtags: selectedTags,
        }),
      });
      if (!res.ok) throw new Error();
      const names = platforms
        .filter((p) => keys.includes(p.key))
        .map((p) => p.label)
        .join(", ");
      showFlash(`Borrador guardado en ${names}`);
      router.refresh();
    } catch {
      showFlash("No se pudo guardar el borrador");
    } finally {
      setSavingDraft(false);
    }
  };

  const copyTextFor = (p: PlatformState) => {
    const cap = p.status === "draft" && p.draftCaption ? p.draftCaption : selectedCaption;
    const tags =
      p.status === "draft" && p.draftHashtags ? p.draftHashtags : selectedTags;
    return { cap, tags };
  };

  const openPlatform = async (p: PlatformState) => {
    const { cap, tags } = copyTextFor(p);
    try {
      await navigator.clipboard.writeText(`${cap}\n\n${tags.join(" ")}`.trim());
    } catch {
      /* clipboard puede fallar sin https */
    }
    window.open(p.uploadUrl, "_blank", "noopener,noreferrer");
    window.open(driveLink, "_blank", "noopener,noreferrer");
    showFlash(`Copiado · abriendo ${p.label}…`);
  };

  const expressPublish = async (p: PlatformState, url: string) => {
    const { cap, tags } = copyTextFor(p);
    try {
      const res = await fetch("/api/posts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clipId,
          platform: p.key,
          caption: cap,
          hashtags: tags,
          url,
        }),
      });
      if (!res.ok) throw new Error();
      showFlash(`Publicado en ${p.label} ✓`);
      router.refresh();
      return true;
    } catch {
      showFlash("No se pudo publicar");
      return false;
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* ── Elige el copy ── */}
      <div className="space-y-6">
        <section className="rounded-lg border bg-card p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Captions</h2>
            <span className="text-xs text-muted-foreground">Elige o crea una</span>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Sugeridas por el nombre del clip. Toca para elegir; el botón copia.
          </p>
          <div className="space-y-2.5">
            {allCaptions.map((c) => {
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

            {addingCaption ? (
              <div className="space-y-2 rounded-md border border-dashed p-3">
                <Textarea
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  placeholder="Escribe tu caption…"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={addCaption}
                    disabled={!newCaption.trim()}
                  >
                    Añadir
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setAddingCaption(false);
                      setNewCaption("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingCaption(true)}
                className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed p-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Plus className="h-4 w-4" /> Añadir caption propia
              </button>
            )}
          </div>
        </section>

        <section className="rounded-lg border bg-card p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Hashtags</h2>
            <span className="text-xs text-muted-foreground">
              {selectedTags.length}/{allTags.length} elegidos
            </span>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Toca para activar o desactivar. Los que añadas quedan para todos los
            clips.
          </p>
          <div className="flex flex-wrap gap-2">
            {allTags.map((t) => {
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

          <div className="mt-3 flex gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                #
              </span>
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addHashtag();
                  }
                }}
                placeholder="nuevo hashtag"
                className="h-9 pl-7"
              />
            </div>
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 shrink-0"
              onClick={addHashtag}
              disabled={!newTag.trim()}
              title="Añadir hashtag"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <CopyButton
              value={`${selectedCaption}\n\n${selectedTags.join(" ")}`.trim()}
              label="Copiar caption + hashtags"
            />
            <CopyButton
              value={selectedTags.join(" ")}
              label={`Solo hashtags (${selectedTags.length})`}
            />
          </div>
        </section>
      </div>

      {/* ── Destinos ── */}
      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <section className="rounded-lg border bg-card p-5">
          <h2 className="text-sm font-semibold">Publica en cada red</h2>

          <div className="mt-3 rounded-md bg-muted/40 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Redes objetivo · toca para quitar o añadir
            </p>
            <div className="flex gap-2">
              {platforms.map((p) => {
                const on = targets.has(p.key) || p.status === "published";
                const locked = p.status === "published";
                return (
                  <button
                    key={p.key}
                    type="button"
                    disabled={locked}
                    onClick={() => toggleTarget(p.key)}
                    title={`${p.label}: ${on ? "objetivo" : "no objetivo"}${
                      locked ? " (publicado)" : ""
                    }`}
                    className={cn(
                      "flex h-9 flex-1 items-center justify-center rounded-md border transition-colors",
                      on
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-dashed text-muted-foreground opacity-60 hover:opacity-100",
                      locked && "cursor-default"
                    )}
                  >
                    <PlatformIcon platform={p.key} className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {draftable.length > 0 ? (
            <div className="mt-4 flex">
              <Button
                className="flex-1 rounded-r-none"
                disabled={savingDraft}
                onClick={() => saveDraft(draftable.map((p) => p.key))}
              >
                {savingDraft ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Guardar borrador
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="rounded-l-none border-l border-primary-foreground/20 px-2"
                    disabled={savingDraft}
                    aria-label="Elegir redes"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Guardar borrador en…</DropdownMenuLabel>
                  {draftable.map((p) => (
                    <DropdownMenuItem
                      key={p.key}
                      onClick={() => saveDraft([p.key])}
                    >
                      <PlatformIcon platform={p.key} className="h-4 w-4" />
                      {p.label}
                    </DropdownMenuItem>
                  ))}
                  {draftable.length > 1 ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => saveDraft(draftable.map((p) => p.key))}
                      >
                        Las {draftable.length} redes
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {visible.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                Sin redes objetivo. Añade alguna arriba.
              </p>
            ) : (
              visible.map((p) => (
                <DestinationCard
                  key={p.key}
                  p={p}
                  onAbrir={openPlatform}
                  onExpress={expressPublish}
                  onOpenDialog={setDialogPlatform}
                />
              ))
            )}
          </div>

          {done.length > 0 && pending.length > 0 ? (
            <p className="mt-4 rounded-md bg-muted/60 p-2.5 text-xs text-muted-foreground">
              ✅ Ya en {done.map((d) => d.label).join(", ")}. Falta:{" "}
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
          suggestedCaptions={allCaptions}
          defaultCaption={
            dialogPlatform.status === "draft" && dialogPlatform.draftCaption
              ? dialogPlatform.draftCaption
              : selectedCaption
          }
          suggestedHashtags={allTags}
          defaultTags={
            dialogPlatform.status === "draft" && dialogPlatform.draftHashtags
              ? dialogPlatform.draftHashtags
              : selectedTags
          }
          onDone={() => {
            setDialogPlatform(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function DestinationCard({
  p,
  onAbrir,
  onExpress,
  onOpenDialog,
}: {
  p: PlatformState;
  onAbrir: (p: PlatformState) => void;
  onExpress: (p: PlatformState, url: string) => Promise<boolean>;
  onOpenDialog: (p: PlatformState) => void;
}) {
  const [url, setUrl] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    if (!url.trim() || busy) return;
    setBusy(true);
    const ok = await onExpress(p, url.trim());
    if (!ok) setBusy(false);
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        p.status === "published" && "bg-muted/40"
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
          <PlatformIcon platform={p.key} className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium leading-tight">{p.label}</p>
          <p className="text-xs text-muted-foreground">{p.uploadLabel}</p>
        </div>
        {p.status === "published" ? (
          <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
            <Check className="h-3 w-3" /> Publicado
          </Badge>
        ) : p.status === "draft" ? (
          <Badge
            variant="outline"
            className="border-sky-300 bg-sky-50 text-sky-700"
          >
            Borrador
          </Badge>
        ) : null}
      </div>

      {p.status === "published" ? (
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
        <div className="mt-3 space-y-2">
          <Button
            size="sm"
            className={cn("w-full", BRAND[p.key].className)}
            style={BRAND[p.key].style}
            onClick={() => onAbrir(p)}
          >
            <PlatformIcon platform={p.key} className="h-4 w-4" /> Abrir {p.label}
          </Button>
          <div className="flex gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="Pega la URL publicada…"
              className="h-9"
            />
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 shrink-0"
              disabled={!url.trim() || busy}
              onClick={submit}
              title="Marcar publicado"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
          </div>
          <button
            type="button"
            onClick={() => onOpenDialog(p)}
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            ¿Usaste otra caption/hashtags? Registrar
          </button>
        </div>
      )}
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
  const captionInList = suggestedCaptions.includes(defaultCaption);
  const [useOther, setUseOther] = React.useState(
    !captionInList && !!defaultCaption
  );
  const [caption, setCaption] = React.useState(
    captionInList ? defaultCaption : suggestedCaptions[0] ?? ""
  );
  const [otherCaption, setOtherCaption] = React.useState(
    captionInList ? "" : defaultCaption
  );
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
              URL del post publicado <span className="text-destructive">*</span>
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
