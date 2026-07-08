// Orquestador del pipeline de análisis (corre 100% en el navegador):
//   descarga → audio WAV → whisper → fotogramas → visión (1 frame por
//   request) → síntesis maestra.
//
// Reglas de vida del video: el binario baja del endpoint de streaming del VPS
// (nunca se almacena ahí), vive como Blob/Object URL mientras dura el
// análisis y se libera SIEMPRE en el finally. Un único AbortController
// (el signal recibido) cancela cualquier fase en curso.

import { extractWavAudio } from "./audio";
import type { LocalAIConfig } from "./config";
import { extractFrames } from "./frames";
import { describeFrame, synthesize, type AnalysisResult } from "./ollama";
import { transcribe } from "./whisper";

export type PipelinePhase =
  | "downloading"
  | "extracting_audio"
  | "transcribing"
  | "extracting_frames"
  | "describing"
  | "synthesizing";

export const PHASE_LABELS: Record<PipelinePhase, string> = {
  downloading: "Descargando video",
  extracting_audio: "Extrayendo audio",
  transcribing: "Transcribiendo (whisper)",
  extracting_frames: "Extrayendo fotogramas",
  describing: "Analizando fotogramas",
  synthesizing: "Generando veredicto",
};

export type PipelineProgress = {
  phase: PipelinePhase;
  detail?: string; // "fotograma 12/38", "45%"…
};

export type PipelineOutput = {
  result: AnalysisResult;
  transcript: string | null;
  visualSummary: string; // descripciones "[00:12] …" unidas por saltos de línea
  frameCount: number;
};

// Resultado crudo de UN fotograma (para el panel de debug: incluye también los
// "nada destacable", que no entran al resumen pero sirven para tunear prompts).
export type FrameDebug = {
  index: number;
  total: number;
  timeSec: number;
  text: string;
  skipped: boolean; // true = "nada destacable" o error, no entró al resumen
};

// Si falla más de este % de fotogramas, el análisis sería basura: abortamos.
const MAX_FRAME_FAILURE_RATIO = 0.4;

export async function analyzeClip(args: {
  clipId: string;
  clipTitle: string;
  durationSec: number | null;
  config: LocalAIConfig;
  signal: AbortSignal;
  onProgress: (p: PipelineProgress) => void;
  // Callbacks de debug: se emiten en vivo para tunear prompts sin esperar a
  // que termine todo el pipeline ni a que se guarde en la DB.
  onTranscript?: (transcript: string | null) => void;
  onFrameDescribed?: (frame: FrameDebug) => void;
}): Promise<PipelineOutput> {
  const { config, signal, onProgress } = args;
  let objectUrl: string | null = null;

  try {
    // ── 1. Descarga (stream desde Drive vía el proxy existente del VPS) ──
    onProgress({ phase: "downloading" });
    const videoBlob = await downloadVideo(args.clipId, signal, (pct) =>
      onProgress({ phase: "downloading", detail: pct })
    );

    // ── 2 y 3. Audio → whisper. Si algo falla aquí, DEGRADAMOS a solo
    // visión en vez de tirar todo el análisis (hay clips sin voz). ──
    let transcript: string | null = null;
    try {
      onProgress({ phase: "extracting_audio" });
      const wav = await extractWavAudio(videoBlob);
      if (wav) {
        onProgress({ phase: "transcribing" });
        transcript = await transcribe({
          whisperUrl: config.whisperUrl,
          wav,
          signal,
        });
      }
    } catch (err) {
      if (isAbort(err)) throw err;
      transcript = null; // seguimos sin transcripción
    }
    args.onTranscript?.(transcript); // debug en vivo

    // ── 4. Fotogramas por canvas ──
    onProgress({ phase: "extracting_frames" });
    objectUrl = URL.createObjectURL(videoBlob);
    const frames = await extractFrames(objectUrl, signal, (done, total) =>
      onProgress({
        phase: "extracting_frames",
        detail: `fotograma ${done}/${total}`,
      })
    );
    // El Object URL ya no hace falta: los frames están en memoria como JPEG.
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;

    // ── 5. Visión: 1 fotograma por request, en secuencia (Ollama procesa de
    // a uno; encolar en paralelo solo suma timeouts). 1 reintento por frame;
    // si falla igual, se salta y se anota el hueco. ──
    const sceneLines: string[] = [];
    let failures = 0;
    for (let i = 0; i < frames.length; i++) {
      onProgress({
        phase: "describing",
        detail: `fotograma ${i + 1}/${frames.length}`,
      });
      const frame = frames[i];
      let description: string | null = null;
      for (let attempt = 0; attempt < 2 && description === null; attempt++) {
        try {
          description = await describeFrame({
            ollamaUrl: config.ollamaUrl,
            model: config.frameModel,
            timeSec: frame.timeSec,
            base64: frame.base64,
            signal,
          });
        } catch (err) {
          if (isAbort(err)) throw err;
          if (attempt === 1) failures++;
        }
      }
      frames[i] = { ...frame, base64: "" }; // soltar el base64 ya procesado
      const relevant =
        description !== null && !/^nada destacable\.?$/i.test(description);
      if (relevant) {
        sceneLines.push(`[${formatTime(frame.timeSec)}] ${description}`);
      }
      // Debug en vivo: emitimos TODO (incluidos "nada destacable" y errores)
      // para poder juzgar y afinar el prompt de fotogramas.
      args.onFrameDescribed?.({
        index: i,
        total: frames.length,
        timeSec: frame.timeSec,
        text: description ?? "⚠️ error (sin respuesta del modelo)",
        skipped: !relevant,
      });
      if (failures / frames.length > MAX_FRAME_FAILURE_RATIO) {
        throw new Error(
          `Ollama falló en demasiados fotogramas (${failures}/${frames.length}). ¿Se quedó sin memoria o el modelo "${config.frameModel}" no es multimodal?`
        );
      }
    }

    // ── 6. Síntesis maestra ──
    onProgress({ phase: "synthesizing" });
    const result = await synthesize({
      ollamaUrl: config.ollamaUrl,
      model: config.synthModel,
      clipTitle: args.clipTitle,
      durationSec: args.durationSec,
      transcript,
      sceneLines,
      signal,
    });

    return {
      result,
      transcript,
      visualSummary: sceneLines.join("\n"),
      frameCount: frames.length,
    };
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

async function downloadVideo(
  clipId: string,
  signal: AbortSignal,
  onPct: (pct: string) => void
): Promise<Blob> {
  const res = await fetch(`/api/clips/${clipId}/video`, { signal });
  if (!res.ok || !res.body) {
    throw new Error(`No se pudo descargar el video (${res.status}).`);
  }
  const total = Number(res.headers.get("content-length")) || 0;
  const reader = res.body.getReader();
  const chunks: BlobPart[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    if (total > 0) onPct(`${Math.round((received / total) * 100)}%`);
  }
  return new Blob(chunks, { type: "video/mp4" });
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}
