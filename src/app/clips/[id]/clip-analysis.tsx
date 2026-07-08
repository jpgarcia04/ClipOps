"use client";

// Análisis IA local del clip: orquesta el pipeline (descarga → whisper →
// visión → veredicto) contra los servicios que corren en la PC del usuario.
// El VPS solo recibe el resultado final en texto.

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CircleAlert,
  Copy,
  Loader2,
  RefreshCw,
  Sparkles,
  Square,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_LOCAL_AI,
  loadLocalAIConfig,
  type LocalAIConfig,
} from "@/lib/local-ai/config";
import { checkOllama, checkWhisper, type ServiceStatus } from "@/lib/local-ai/health";
import {
  analyzeClip,
  isAbort,
  PHASE_LABELS,
  type FrameDebug,
  type PipelinePhase,
} from "@/lib/local-ai/pipeline";
import { cn } from "@/lib/utils";

export type SavedAnalysis = {
  score: number;
  verdict: string;
  reasoning: string;
  title: string;
  altTitles: string[];
  hashtags: string[];
  transcript: string | null;
  visualSummary: string | null;
  model: string;
  updatedAt: string;
};

const PHASES: PipelinePhase[] = [
  "downloading",
  "extracting_audio",
  "transcribing",
  "extracting_frames",
  "describing",
  "synthesizing",
];

type RunState =
  | { status: "idle" }
  | { status: "running"; phase: PipelinePhase; detail?: string }
  | { status: "saving" }
  | { status: "error"; phase: PipelinePhase | null; message: string };

type Action =
  | { type: "start" }
  | { type: "progress"; phase: PipelinePhase; detail?: string }
  | { type: "saving" }
  | { type: "finish" }
  | { type: "fail"; phase: PipelinePhase | null; message: string }
  | { type: "reset" };

function reducer(state: RunState, action: Action): RunState {
  switch (action.type) {
    case "start":
      return { status: "running", phase: "downloading" };
    case "progress":
      return { status: "running", phase: action.phase, detail: action.detail };
    case "saving":
      return { status: "saving" };
    case "finish":
    case "reset":
      return { status: "idle" };
    case "fail":
      return { status: "error", phase: action.phase, message: action.message };
  }
}

export function ClipAnalysis({
  clipId,
  clipTitle,
  durationSec,
  saved,
}: {
  clipId: string;
  clipTitle: string;
  durationSec: number | null;
  saved: SavedAnalysis | null;
}) {
  const router = useRouter();
  const [config, setConfig] = React.useState<LocalAIConfig>(DEFAULT_LOCAL_AI);
  const [ollama, setOllama] = React.useState<ServiceStatus>("checking");
  const [whisper, setWhisper] = React.useState<ServiceStatus>("checking");
  const [frameModelPresent, setFrameModelPresent] = React.useState(true);
  const [synthModelPresent, setSynthModelPresent] = React.useState(true);
  const [run, dispatch] = React.useReducer(reducer, { status: "idle" });
  const [analysis, setAnalysis] = React.useState<SavedAnalysis | null>(saved);
  // Debug en vivo (para tunear prompts): transcript + descripción de cada
  // fotograma según van llegando, sin esperar a que termine ni se guarde.
  const [liveTranscript, setLiveTranscript] = React.useState<string | null>(null);
  const [liveFrames, setLiveFrames] = React.useState<FrameDebug[]>([]);
  const abortRef = React.useRef<AbortController | null>(null);
  // La fase actual vive también en un ref: el catch de start() no puede leer
  // `run` (closure viejo del render en que se creó la función).
  const phaseRef = React.useRef<PipelinePhase | null>(null);

  const recheck = React.useCallback(async (cfg: LocalAIConfig) => {
    setOllama("checking");
    setWhisper("checking");
    const [o, w] = await Promise.all([checkOllama(cfg), checkWhisper(cfg)]);
    setOllama(o.status);
    setFrameModelPresent(o.frameModelPresent);
    setSynthModelPresent(o.synthModelPresent);
    setWhisper(w);
  }, []);

  React.useEffect(() => {
    const cfg = loadLocalAIConfig();
    setConfig(cfg);
    void recheck(cfg);
    // Si el usuario navega a otro clip a mitad del análisis, cancelamos todo
    // (fetches, seeks de video) y el finally del pipeline libera los blobs.
    return () => abortRef.current?.abort();
  }, [recheck]);

  const start = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    phaseRef.current = "downloading";
    setLiveTranscript(null);
    setLiveFrames([]);
    dispatch({ type: "start" });
    try {
      const output = await analyzeClip({
        clipId,
        clipTitle,
        durationSec,
        config,
        signal: controller.signal,
        onProgress: (p) => {
          phaseRef.current = p.phase;
          dispatch({ type: "progress", phase: p.phase, detail: p.detail });
        },
        onTranscript: (t) => setLiveTranscript(t),
        onFrameDescribed: (f) => setLiveFrames((prev) => [...prev, f]),
      });

      dispatch({ type: "saving" });
      const body = {
        ...output.result,
        transcript: output.transcript,
        visualSummary: output.visualSummary,
        model: `${config.frameModel} + ${config.synthModel}`,
      };
      const res = await fetch(`/api/clips/${clipId}/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("No se pudo guardar el análisis.");
      const savedNow = (await res.json()) as SavedAnalysis;
      setAnalysis(savedNow);
      dispatch({ type: "finish" });
    } catch (err) {
      if (isAbort(err)) {
        dispatch({ type: "reset" });
        return;
      }
      dispatch({
        type: "fail",
        phase: phaseRef.current,
        message: err instanceof Error ? err.message : "Error desconocido.",
      });
    } finally {
      abortRef.current = null;
    }
  };

  const cancel = () => abortRef.current?.abort();

  const busy = run.status === "running" || run.status === "saving";
  const modelsPresent = frameModelPresent && synthModelPresent;
  const servicesReady =
    ollama === "online" && whisper === "online" && modelsPresent;
  const missingModels = [
    frameModelPresent ? null : config.frameModel,
    synthModelPresent ? null : config.synthModel,
  ].filter(Boolean) as string[];

  return (
    <div className="mb-6 rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Análisis IA (local)</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ServiceChip label="Ollama" status={ollama} />
          <ServiceChip label="Whisper" status={whisper} />
          {ollama === "online" && missingModels.length > 0 ? (
            <Badge variant="destructive" className="text-[10px]">
              falta {missingModels.join(", ")}
            </Badge>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => void recheck(config)}
            title="Volver a comprobar los servicios locales"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {!servicesReady && !busy ? (
        <SetupHelp
          config={config}
          ollama={ollama}
          whisper={whisper}
          missingModels={missingModels}
        />
      ) : null}

      {busy ? (
        <div className="mt-4 space-y-2">
          {PHASES.map((phase) => {
            const currentIdx =
              run.status === "running" ? PHASES.indexOf(run.phase) : PHASES.length;
            const idx = PHASES.indexOf(phase);
            const state =
              idx < currentIdx ? "done" : idx === currentIdx ? "active" : "todo";
            return (
              <div
                key={phase}
                className={cn(
                  "flex items-center gap-2 text-xs",
                  state === "todo" && "text-muted-foreground/50",
                  state === "done" && "text-muted-foreground"
                )}
              >
                {state === "done" ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : state === "active" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span className="inline-block h-3.5 w-3.5 rounded-full border" />
                )}
                <span>{PHASE_LABELS[phase]}</span>
                {state === "active" && run.status === "running" && run.detail ? (
                  <span className="text-muted-foreground">— {run.detail}</span>
                ) : null}
              </div>
            );
          })}
          {run.status === "saving" ? (
            <div className="flex items-center gap-2 text-xs">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando…
            </div>
          ) : (
            <Button variant="outline" size="sm" className="mt-2" onClick={cancel}>
              <Square className="mr-1.5 h-3 w-3" /> Cancelar
            </Button>
          )}
        </div>
      ) : null}

      {run.status === "error" ? (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs">
          <div className="flex items-center gap-2 font-medium text-destructive">
            <CircleAlert className="h-3.5 w-3.5" />
            Falló en: {run.phase ? PHASE_LABELS[run.phase] : "análisis"}
          </div>
          <p className="mt-1 text-muted-foreground">{run.message}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={start}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {liveTranscript !== null || liveFrames.length > 0 ? (
        <LiveDebugPanel transcript={liveTranscript} frames={liveFrames} />
      ) : null}

      {!busy ? (
        <div className="mt-4">
          <Button
            size="sm"
            onClick={start}
            disabled={!servicesReady}
            title={
              servicesReady
                ? undefined
                : "Enciende Ollama y whisper-server en tu PC para analizar"
            }
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            {analysis ? "Re-analizar clip" : "Analizar clip"}
          </Button>
        </div>
      ) : null}

      {analysis && !busy ? (
        <AnalysisResultCard
          clipId={clipId}
          analysis={analysis}
          onTitleApplied={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}

function ServiceChip({ label, status }: { label: string; status: ServiceStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px]",
        status === "online" && "border-green-600/30 text-green-700 dark:text-green-500",
        status === "offline" && "border-destructive/40 text-destructive",
        status === "checking" && "text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "online" && "bg-green-500",
          status === "offline" && "bg-destructive",
          status === "checking" && "animate-pulse bg-muted-foreground"
        )}
      />
      {label}
    </span>
  );
}

function SetupHelp({
  config,
  ollama,
  whisper,
  missingModels,
}: {
  config: LocalAIConfig;
  ollama: ServiceStatus;
  whisper: ServiceStatus;
  missingModels: string[];
}) {
  if (ollama === "checking" || whisper === "checking") return null;
  return (
    <div className="mt-3 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">
        Para analizar necesitas los servicios de IA encendidos en TU PC
        (o el navegador está bloqueando la conexión a localhost):
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-4">
        {ollama === "offline" ? (
          <li>
            Ollama apagado o sin CORS. Corre{" "}
            <code className="rounded bg-muted px-1">scripts/start-local-ai.ps1</code>{" "}
            del repo, o manualmente:{" "}
            <code className="rounded bg-muted px-1">
              $env:OLLAMA_ORIGINS=&quot;*&quot;; ollama serve
            </code>
          </li>
        ) : null}
        {ollama === "online" && missingModels.length > 0
          ? missingModels.map((m) => (
              <li key={m}>
                Falta el modelo:{" "}
                <code className="rounded bg-muted px-1">ollama pull {m}</code>
              </li>
            ))
          : null}
        {whisper === "offline" ? (
          <li>
            whisper-server apagado (esperado en{" "}
            <code className="rounded bg-muted px-1">{config.whisperUrl}</code>).
            También lo arranca{" "}
            <code className="rounded bg-muted px-1">scripts/start-local-ai.ps1</code>.
          </li>
        ) : null}
      </ul>
    </div>
  );
}

// Panel de debug en vivo: se llena mientras corre el pipeline. Sirve para
// juzgar y afinar los prompts (transcript de whisper + qué "ve" el modelo de
// fotogramas en cada instante, incluidos los que descarta como irrelevantes).
function LiveDebugPanel({
  transcript,
  frames,
}: {
  transcript: string | null;
  frames: FrameDebug[];
}) {
  const [open, setOpen] = React.useState(true);
  const kept = frames.filter((f) => !f.skipped).length;

  const fmt = (sec: number) =>
    `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

  return (
    <div className="mt-4 rounded-md border border-dashed bg-muted/30 p-3">
      <button
        type="button"
        className="flex w-full items-center justify-between text-[11px] font-medium text-foreground"
        onClick={() => setOpen((v) => !v)}
      >
        <span>
          🐞 Debug en vivo · {frames.length} fotograma(s), {kept} relevante(s)
        </span>
        <span className="text-muted-foreground">{open ? "ocultar" : "ver"}</span>
      </button>

      {open ? (
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Transcripción (whisper)
            </p>
            <p className="mt-1 whitespace-pre-wrap text-[11px] text-muted-foreground">
              {transcript === null
                ? "— (aún no)"
                : transcript.trim() || "(sin voz / vacío)"}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Fotogramas ({frames.length})
            </p>
            <div className="mt-1 max-h-64 space-y-1 overflow-y-auto">
              {frames.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">— (aún no)</p>
              ) : (
                frames.map((f) => (
                  <div
                    key={f.index}
                    className={cn(
                      "flex gap-2 text-[11px]",
                      f.skipped ? "text-muted-foreground/50" : "text-muted-foreground"
                    )}
                  >
                    <span className="shrink-0 font-mono">{fmt(f.timeSec)}</span>
                    <span>{f.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AnalysisResultCard({
  clipId,
  analysis,
  onTitleApplied,
}: {
  clipId: string;
  analysis: SavedAnalysis;
  onTitleApplied: () => void;
}) {
  const [applying, setApplying] = React.useState(false);
  const [applied, setApplied] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(false);

  const verdictStyle =
    analysis.verdict === "publicar"
      ? "border-green-600/40 bg-green-500/10 text-green-700 dark:text-green-500"
      : analysis.verdict === "editar"
        ? "border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-500"
        : "border-destructive/40 bg-destructive/10 text-destructive";

  const applyTitle = async () => {
    setApplying(true);
    try {
      await fetch(`/api/clips/${clipId}/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: analysis.title }),
      });
      setApplied(true);
      onTitleApplied();
    } finally {
      setApplying(false);
    }
  };

  const copyHashtags = async () => {
    await navigator.clipboard.writeText(analysis.hashtags.join(" "));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mt-4 space-y-3 border-t pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-sm font-semibold",
            verdictStyle
          )}
        >
          {analysis.score}/100 · {analysis.verdict}
        </div>
        <span className="text-[10px] text-muted-foreground">
          {analysis.model} ·{" "}
          {new Date(analysis.updatedAt).toLocaleString("es-MX", {
            dateStyle: "short",
            timeStyle: "short",
          })}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">{analysis.reasoning}</p>

      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">“{analysis.title}”</p>
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[11px]"
            onClick={applyTitle}
            disabled={applying || applied}
          >
            {applied ? "Aplicado ✓" : "Usar como título"}
          </Button>
        </div>
        {analysis.altTitles.length > 0 ? (
          <ul className="space-y-0.5 text-xs text-muted-foreground">
            {analysis.altTitles.map((t) => (
              <li key={t}>· {t}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {analysis.hashtags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {analysis.hashtags.map((h) => (
            <Badge key={h} variant="secondary" className="text-[10px]">
              {h}
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px]"
            onClick={copyHashtags}
          >
            <Copy className="mr-1 h-3 w-3" /> {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
      ) : null}

      {analysis.transcript || analysis.visualSummary ? (
        <div>
          <button
            type="button"
            className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setShowDetails((v) => !v)}
          >
            {showDetails ? "Ocultar detalles" : "Ver transcripción y escenas"}
          </button>
          {showDetails ? (
            <div className="mt-2 space-y-2 text-[11px] text-muted-foreground">
              {analysis.transcript ? (
                <div>
                  <p className="font-medium text-foreground">Transcripción</p>
                  <p className="whitespace-pre-wrap">{analysis.transcript}</p>
                </div>
              ) : null}
              {analysis.visualSummary ? (
                <div>
                  <p className="font-medium text-foreground">Escenas</p>
                  <p className="whitespace-pre-wrap">{analysis.visualSummary}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
