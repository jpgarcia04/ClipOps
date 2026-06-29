"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Download,
  Loader2,
  Pause,
  Play,
  Plus,
  Scissors,
  Trash2,
  Type,
  Volume2,
  VolumeX,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  EMPTY_EDIT,
  OVERLAY_COLORS,
  type ClipEditData,
  type TextOverlay,
} from "@/lib/edit";
import { cn } from "@/lib/utils";

function fmt(t: number): string {
  if (!Number.isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const d = Math.floor((t % 1) * 10);
  return `${m}:${s.toString().padStart(2, "0")}.${d}`;
}

function newOverlay(): TextOverlay {
  return {
    id: `ov_${Date.now()}`,
    text: "Tu texto",
    xPct: 0.5,
    yPct: 0.2,
    sizePct: 0.08,
    color: "#ffffff",
    bg: true,
    bold: true,
    start: null,
    end: null,
  };
}

export function ClipEditor({
  clipId,
  title,
  durationSec,
  initialEdit,
}: {
  clipId: string;
  title: string;
  durationSec: number | null;
  initialEdit: ClipEditData;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="brand-gradient inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
      >
        <Wand2 className="h-4 w-4" /> Editar video
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[94vh] max-w-[min(96vw,1080px)] overflow-hidden p-0">
          <DialogHeader className="border-b px-5 py-3">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Wand2 className="h-4 w-4 text-primary" /> Editar ·{" "}
              <span className="truncate font-normal text-muted-foreground">
                {title}
              </span>
            </DialogTitle>
          </DialogHeader>
          {open ? (
            <EditorBody
              clipId={clipId}
              durationSec={durationSec}
              initialEdit={initialEdit}
              onSaved={() => router.refresh()}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditorBody({
  clipId,
  durationSec,
  initialEdit,
  onSaved,
}: {
  clipId: string;
  durationSec: number | null;
  initialEdit: ClipEditData;
  onSaved: () => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);

  const [duration, setDuration] = React.useState(durationSec ?? 0);
  const [current, setCurrent] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [stageH, setStageH] = React.useState(0);

  const [trimStart, setTrimStart] = React.useState<number | null>(
    initialEdit.trimStart
  );
  const [trimEnd, setTrimEnd] = React.useState<number | null>(
    initialEdit.trimEnd
  );
  const [muted, setMuted] = React.useState(initialEdit.muted);
  const [overlays, setOverlays] = React.useState<TextOverlay[]>(
    initialEdit.overlays.length ? initialEdit.overlays : []
  );
  const [selected, setSelected] = React.useState<string | null>(null);

  const [saving, setSaving] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [flash, setFlash] = React.useState<string | null>(null);

  const effStart = trimStart ?? 0;
  const effEnd = trimEnd ?? duration;

  // Mantén medido el alto del escenario para escalar el tamaño de fuente.
  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStageH(el.clientHeight));
    ro.observe(el);
    setStageH(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const showFlash = (m: string) => {
    setFlash(m);
    window.setTimeout(() => setFlash(null), 2500);
  };

  // ── Reproducción acotada al recorte (loop dentro del trim) ──
  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.currentTime >= effEnd) {
      v.currentTime = effStart;
      if (!playing) v.pause();
    }
    setCurrent(v.currentTime);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (v.currentTime < effStart || v.currentTime >= effEnd) {
        v.currentTime = effStart;
      }
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const seekTo = (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(Math.max(t, 0), duration || 0);
    setCurrent(v.currentTime);
  };

  // ── Timeline: click para buscar ──
  const pctFromClientX = (clientX: number) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r || r.width === 0) return 0;
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  };

  const onTrackPointerDown = (e: React.PointerEvent) => {
    if (!duration) return;
    seekTo(pctFromClientX(e.clientX) * duration);
  };

  const dragHandle =
    (which: "start" | "end") => (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!duration) return;
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const move = (ev: PointerEvent) => {
        const t = pctFromClientX(ev.clientX) * duration;
        if (which === "start") {
          setTrimStart(Math.min(t, (trimEnd ?? duration) - 0.1));
        } else {
          setTrimEnd(Math.max(t, (trimStart ?? 0) + 0.1));
        }
      };
      const up = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        try {
          e.currentTarget.releasePointerCapture(ev.pointerId);
        } catch {
          /* no-op */
        }
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };

  // ── Overlays: arrastrar sobre el video ──
  const dragOverlay =
    (id: string) => (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      setSelected(id);
      const stage = stageRef.current;
      if (!stage) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const move = (ev: PointerEvent) => {
        const r = stage.getBoundingClientRect();
        const x = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
        const y = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height));
        setOverlays((cur) =>
          cur.map((o) => (o.id === id ? { ...o, xPct: x, yPct: y } : o))
        );
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };

  const patchOverlay = (id: string, patch: Partial<TextOverlay>) =>
    setOverlays((cur) =>
      cur.map((o) => (o.id === id ? { ...o, ...patch } : o))
    );

  const addOverlay = () => {
    const o = newOverlay();
    setOverlays((cur) => [...cur, o]);
    setSelected(o.id);
  };

  const removeOverlay = (id: string) => {
    setOverlays((cur) => cur.filter((o) => o.id !== id));
    if (selected === id) setSelected(null);
  };

  const overlayVisible = (o: TextOverlay) => {
    if (o.id === selected) return true; // el seleccionado siempre se ve (para editar)
    const from = o.start ?? effStart;
    const to = o.end ?? effEnd;
    return current >= from && current <= to;
  };

  const buildPayload = () => ({
    trimStart,
    trimEnd,
    muted,
    overlays: overlays
      .filter((o) => o.text.trim().length > 0)
      .map((o) => ({ ...o, text: o.text.trim() })),
  });

  const save = async (): Promise<boolean> => {
    setSaving(true);
    try {
      const res = await fetch(`/api/clips/${clipId}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) throw new Error();
      showFlash("Edición guardada ✓");
      onSaved();
      return true;
    } catch {
      showFlash("No se pudo guardar");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const exportVideo = async () => {
    setExporting(true);
    showFlash("Guardando y preparando el MP4 editado…");
    const ok = await save();
    if (!ok) {
      setExporting(false);
      return;
    }
    // La descarga la sirve el backend aplicando ffmpeg con los parámetros.
    const a = document.createElement("a");
    a.href = `/api/clips/${clipId}/export`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => setExporting(false), 1500);
  };

  const sel = overlays.find((o) => o.id === selected) ?? null;
  const startPct = duration ? (effStart / duration) * 100 : 0;
  const endPct = duration ? (effEnd / duration) * 100 : 100;
  const playPct = duration ? (current / duration) * 100 : 0;

  return (
    <div className="grid max-h-[82vh] gap-0 overflow-hidden md:grid-cols-[1fr_320px]">
      {/* ── Escenario + timeline ── */}
      <div className="flex flex-col gap-3 overflow-y-auto bg-muted/20 p-4">
        <div className="flex items-center justify-center">
          <div ref={stageRef} className="relative inline-block">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              src={`/api/clips/${clipId}/video`}
              playsInline
              onLoadedMetadata={(e) => {
                const d = e.currentTarget.duration;
                if (Number.isFinite(d) && d > 0) setDuration(d);
                e.currentTarget.muted = muted;
              }}
              onTimeUpdate={onTimeUpdate}
              onClick={() => setSelected(null)}
              onPause={() => setPlaying(false)}
              onPlay={() => setPlaying(true)}
              className="block max-h-[58vh] w-auto max-w-full rounded-lg bg-black"
            />

            {overlays.map((o) =>
              overlayVisible(o) ? (
                <div
                  key={o.id}
                  onPointerDown={dragOverlay(o.id)}
                  style={{
                    left: `${o.xPct * 100}%`,
                    top: `${o.yPct * 100}%`,
                    transform: "translate(-50%,-50%)",
                    fontSize: `${Math.max(8, o.sizePct * stageH)}px`,
                    color: o.color,
                    fontWeight: o.bold ? 700 : 400,
                    textShadow: o.bg
                      ? "none"
                      : "0 1px 3px rgba(0,0,0,.8), 0 0 2px rgba(0,0,0,.9)",
                  }}
                  className={cn(
                    "absolute cursor-move select-none whitespace-pre rounded-md px-2 py-0.5 leading-tight",
                    o.bg && "bg-black/55",
                    o.id === selected && "outline outline-2 outline-primary"
                  )}
                >
                  {o.text || "Texto"}
                </div>
              ) : null
            )}
          </div>
        </div>

        {/* Controles de reproducción */}
        <div className="flex items-center gap-3">
          <Button size="icon" variant="secondary" onClick={togglePlay} className="h-9 w-9 shrink-0">
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <span className="tabular-nums text-xs text-muted-foreground">
            {fmt(current)} / {fmt(duration)}
          </span>
          <Button
            size="sm"
            variant={muted ? "default" : "outline"}
            onClick={() => setMuted((m) => !m)}
            className="ml-auto gap-1.5"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {muted ? "Sin audio" : "Con audio"}
          </Button>
        </div>

        {/* Timeline de recorte */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Scissors className="h-3.5 w-3.5" /> Recorte
            </span>
            <span className="tabular-nums">
              {fmt(effStart)} → {fmt(effEnd)} ({fmt(Math.max(0, effEnd - effStart))})
            </span>
          </div>
          <div
            ref={trackRef}
            onPointerDown={onTrackPointerDown}
            className="relative h-10 cursor-pointer touch-none select-none rounded-md bg-card"
          >
            <div className="absolute inset-x-2 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted" />
            <div
              className="brand-gradient absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
              style={{ left: `${startPct}%`, right: `${100 - endPct}%` }}
            />
            {/* Playhead */}
            <div
              className="pointer-events-none absolute top-1 bottom-1 w-0.5 bg-foreground/70"
              style={{ left: `${playPct}%` }}
            />
            {/* Handles */}
            <button
              type="button"
              aria-label="Inicio del recorte"
              onPointerDown={dragHandle("start")}
              className="absolute top-1/2 h-6 w-3 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-sm border border-primary bg-background shadow"
              style={{ left: `${startPct}%` }}
            />
            <button
              type="button"
              aria-label="Fin del recorte"
              onPointerDown={dragHandle("end")}
              className="absolute top-1/2 h-6 w-3 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-sm border border-primary bg-background shadow"
              style={{ left: `${endPct}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setTrimStart(current)}>
              Marcar inicio aquí
            </Button>
            <Button size="sm" variant="outline" onClick={() => setTrimEnd(current)}>
              Marcar fin aquí
            </Button>
            {(trimStart != null || trimEnd != null) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setTrimStart(null);
                  setTrimEnd(null);
                }}
              >
                Quitar recorte
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Panel de controles ── */}
      <div className="flex max-h-[82vh] flex-col border-t md:border-l md:border-t-0">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <Type className="h-4 w-4" /> Textos
          </span>
          <Button size="sm" variant="outline" onClick={addOverlay} className="gap-1">
            <Plus className="h-4 w-4" /> Añadir
          </Button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {overlays.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              Añade un texto y arrástralo sobre el video para colocarlo.
            </p>
          ) : (
            overlays.map((o) => (
              <div
                key={o.id}
                onClick={() => setSelected(o.id)}
                className={cn(
                  "space-y-2.5 rounded-lg border p-3 transition-colors",
                  o.id === selected ? "border-primary ring-1 ring-primary" : "hover:bg-accent/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={o.text}
                    onChange={(e) => patchOverlay(o.id, { text: e.target.value })}
                    placeholder="Escribe el texto…"
                    className="h-8"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeOverlay(o.id)}
                    aria-label="Eliminar texto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {o.id === selected ? (
                  <>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {OVERLAY_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => patchOverlay(o.id, { color: c })}
                          className={cn(
                            "h-5 w-5 rounded-full border",
                            o.color === c ? "ring-2 ring-primary ring-offset-1" : "border-input"
                          )}
                          style={{ backgroundColor: c }}
                          aria-label={`Color ${c}`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-10 text-[11px] text-muted-foreground">Tamaño</span>
                      <input
                        type="range"
                        min={0.04}
                        max={0.2}
                        step={0.005}
                        value={o.sizePct}
                        onChange={(e) =>
                          patchOverlay(o.id, { sizePct: Number(e.target.value) })
                        }
                        className="flex-1 accent-violet-600"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => patchOverlay(o.id, { bold: !o.bold })}
                        className={cn(
                          "flex-1 rounded-md border px-2 py-1 text-xs font-semibold transition-colors",
                          o.bold ? "border-primary bg-primary/10" : "text-muted-foreground"
                        )}
                      >
                        Negrita
                      </button>
                      <button
                        type="button"
                        onClick={() => patchOverlay(o.id, { bg: !o.bg })}
                        className={cn(
                          "flex-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                          o.bg ? "border-primary bg-primary/10" : "text-muted-foreground"
                        )}
                      >
                        Fondo
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            ))
          )}
        </div>

        {/* Acciones */}
        <div className="space-y-2 border-t p-4">
          {flash ? (
            <p className="rounded-md bg-muted px-3 py-1.5 text-center text-xs text-muted-foreground">
              {flash}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={save}
              disabled={saving || exporting}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Guardar
            </Button>
            <Button
              className="flex-1"
              onClick={exportVideo}
              disabled={saving || exporting}
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exportar MP4
            </Button>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            No-destructivo: el original en Drive no se toca.
          </p>
        </div>
      </div>
    </div>
  );
}
