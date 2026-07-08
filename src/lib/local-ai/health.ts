// Health checks de los servicios locales. Se ejecutan ANTES de permitir el
// análisis: es mejor un "enciende Ollama" claro que un fetch fallando a mitad
// del pipeline. Ojo: un servicio apagado y un bloqueo CORS/red-local del
// navegador producen el mismo TypeError, por eso los mensajes cubren ambos.

import type { LocalAIConfig } from "./config";

export type ServiceStatus = "checking" | "online" | "offline";

export type OllamaHealth = {
  status: ServiceStatus;
  frameModelPresent: boolean; // ¿está descargado el modelo de fotogramas?
  synthModelPresent: boolean; // ¿está descargado el modelo del veredicto?
};

function hasModel(models: { name: string }[], wanted: string): boolean {
  const w = wanted.toLowerCase();
  return models.some(
    (m) =>
      m.name.toLowerCase() === w ||
      m.name.toLowerCase().startsWith(`${w}:`) ||
      `${m.name.toLowerCase()}:latest` === `${w}:latest`
  );
}

export async function checkOllama(config: LocalAIConfig): Promise<OllamaHealth> {
  try {
    const res = await fetch(`${config.ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      return { status: "offline", frameModelPresent: false, synthModelPresent: false };
    }
    const data = (await res.json()) as { models?: { name: string }[] };
    const models = data.models ?? [];
    return {
      status: "online",
      frameModelPresent: hasModel(models, config.frameModel),
      synthModelPresent: hasModel(models, config.synthModel),
    };
  } catch {
    return { status: "offline", frameModelPresent: false, synthModelPresent: false };
  }
}

export async function checkWhisper(
  config: LocalAIConfig
): Promise<ServiceStatus> {
  try {
    // whisper-server no tiene /health; un GET a la raíz devuelve la página de
    // prueba (200) y nos basta para saber que está vivo y accesible.
    const res = await fetch(config.whisperUrl, {
      signal: AbortSignal.timeout(4000),
    });
    return res.ok ? "online" : "offline";
  } catch {
    return "offline";
  }
}
