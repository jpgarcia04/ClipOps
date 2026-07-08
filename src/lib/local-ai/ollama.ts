// Cliente de la instancia local de Ollama. Requiere que el usuario arranque
// Ollama con OLLAMA_ORIGINS incluyendo el dominio de la app (ver
// scripts/start-local-ai.ps1). keep_alive mantiene el modelo en VRAM entre
// requests para no pagar la carga (~10s) en cada fotograma.

import {
  FRAME_SYSTEM_PROMPT,
  frameUserPrompt,
  MASTER_RESULT_SCHEMA,
  MASTER_SYSTEM_PROMPT,
  masterUserPrompt,
} from "./prompts";

const KEEP_ALIVE = "15m";
// El primer request paga la carga del modelo en VRAM; los demás son rápidos.
const FRAME_TIMEOUT_MS = 120_000;
const MASTER_TIMEOUT_MS = 300_000;

export type AnalysisResult = {
  score: number;
  verdict: "publicar" | "editar" | "descartar";
  reasoning: string;
  title: string;
  altTitles: string[];
  hashtags: string[];
};

type ChatMessage = {
  role: "system" | "user";
  content: string;
  images?: string[];
};

async function chat(args: {
  ollamaUrl: string;
  model: string;
  messages: ChatMessage[];
  format?: unknown;
  temperature: number;
  timeoutMs: number;
  signal: AbortSignal;
}): Promise<string> {
  const timeout = AbortSignal.timeout(args.timeoutMs);
  const signal =
    "any" in AbortSignal
      ? AbortSignal.any([args.signal, timeout])
      : args.signal;

  const res = await fetch(`${args.ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: args.model,
      messages: args.messages,
      stream: false,
      keep_alive: KEEP_ALIVE,
      ...(args.format ? { format: args.format } : {}),
      options: { temperature: args.temperature },
    }),
    signal,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Ollama respondió ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { message?: { content?: string } };
  return data.message?.content ?? "";
}

// Fase C: describe UN fotograma. Requests independientes (sin historial) para
// no desbordar el contexto del modelo; Ollama los encola como mejor le venga.
export async function describeFrame(args: {
  ollamaUrl: string;
  model: string;
  timeSec: number;
  base64: string;
  signal: AbortSignal;
}): Promise<string> {
  const text = await chat({
    ollamaUrl: args.ollamaUrl,
    model: args.model,
    messages: [
      { role: "system", content: FRAME_SYSTEM_PROMPT },
      {
        role: "user",
        content: frameUserPrompt(args.timeSec),
        images: [args.base64],
      },
    ],
    temperature: 0.2, // descripciones literales, no creatividad
    timeoutMs: FRAME_TIMEOUT_MS,
    signal: args.signal,
  });
  return text.trim();
}

// Fase D: síntesis maestra (solo texto) con salida JSON forzada por schema.
export async function synthesize(args: {
  ollamaUrl: string;
  model: string;
  clipTitle: string;
  durationSec: number | null;
  transcript: string | null;
  sceneLines: string[];
  signal: AbortSignal;
}): Promise<AnalysisResult> {
  const raw = await chat({
    ollamaUrl: args.ollamaUrl,
    model: args.model,
    messages: [
      { role: "system", content: MASTER_SYSTEM_PROMPT },
      {
        role: "user",
        content: masterUserPrompt({
          clipTitle: args.clipTitle,
          durationSec: args.durationSec,
          transcript: args.transcript,
          sceneLines: args.sceneLines,
        }),
      },
    ],
    format: MASTER_RESULT_SCHEMA,
    temperature: 0.7, // aquí sí queremos títulos con chispa
    timeoutMs: MASTER_TIMEOUT_MS,
    signal: args.signal,
  });

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("El modelo devolvió un JSON inválido en la síntesis.");
  }

  const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
  const verdict = ["publicar", "editar", "descartar"].includes(
    String(parsed.verdict)
  )
    ? (String(parsed.verdict) as AnalysisResult["verdict"])
    : score >= 70
      ? "publicar"
      : score >= 40
        ? "editar"
        : "descartar";

  const toStrings = (v: unknown): string[] =>
    Array.isArray(v) ? v.map(String).filter(Boolean) : [];

  return {
    score,
    verdict,
    reasoning: String(parsed.reasoning ?? "").trim(),
    title: String(parsed.title ?? "").trim(),
    altTitles: toStrings(parsed.alt_titles).slice(0, 3),
    hashtags: toStrings(parsed.hashtags)
      .map((h) => {
        const t = h.trim().toLowerCase().replace(/\s+/g, "");
        return t.startsWith("#") ? t : `#${t}`;
      })
      .filter((h) => h.length > 1)
      .slice(0, 14),
  };
}
