// Config de los servicios de IA local (Ollama + whisper.cpp) que corren en la
// PC de cada usuario. Vive en localStorage porque es por-máquina, no por-cuenta:
// cada PC puede usar puertos o modelos distintos. El VPS nunca toca el video.

export type LocalAIConfig = {
  ollamaUrl: string; // instancia local de Ollama
  whisperUrl: string; // whisper-server de whisper.cpp
  // Dos modelos: uno chico y rápido para describir cada fotograma (muchas
  // llamadas) y el 4b para el veredicto final (una sola llamada, más criterio).
  frameModel: string; // Fase C — descripción de fotogramas (multimodal)
  synthModel: string; // Fase D — veredicto + título + hashtags
};

export const DEFAULT_LOCAL_AI: LocalAIConfig = {
  ollamaUrl: "http://localhost:11434",
  whisperUrl: "http://localhost:8080",
  frameModel: "qwen3.5:2b",
  synthModel: "qwen3.5:4b",
};

const STORAGE_KEY = "clipops.localAI";

export function loadLocalAIConfig(): LocalAIConfig {
  if (typeof window === "undefined") return DEFAULT_LOCAL_AI;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LOCAL_AI;
    return { ...DEFAULT_LOCAL_AI, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_LOCAL_AI;
  }
}

export function saveLocalAIConfig(config: LocalAIConfig) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
