// Prompts del pipeline de análisis. Todo está orientado a clips de gameplay
// de EA Sports FC (FIFA) para TikTok / Reels / Shorts: jugadas, marcador,
// hooks de retención y hashtags del nicho.

// ── Fase C: sub-agente visual (1 frame por request) ──
export const FRAME_SYSTEM_PROMPT = `Eres un analista de video experto en EA Sports FC (el juego de fútbol, antes FIFA). Recibirás UN fotograma de un clip de gameplay.

Describe en 1 o 2 frases, en español, SOLO lo relevante que se ve:
- La jugada: gol, remate, volea, tiro libre, penal, caño, regate/skill move, atajada, contraataque, fallo, bug o momento gracioso.
- Contexto visible en el HUD: marcador, minuto de partido, equipos, modo de juego (Ultimate Team, Rivals, FUT Champions, Clubes).
- Celebraciones, repeticiones (replay), menús o pantallas de resultado (victoria/derrota, recompensas, sobres).

Sé concreto y literal con lo que se ve. Si el fotograma no muestra nada destacable (juego neutro a media cancha), responde exactamente: "nada destacable".`;

export function frameUserPrompt(timeSec: number): string {
  return `Fotograma en el segundo ${timeSec} del clip. ¿Qué ocurre?`;
}

// ── Fase D: análisis maestro (solo texto) ──
export const MASTER_SYSTEM_PROMPT = `Eres el curador de contenido de un canal de clips de EA Sports FC para TikTok, Instagram Reels y YouTube Shorts. Tu público: jugadores de FC/FUT hispanohablantes de 15 a 30 años.

Recibirás la transcripción del audio del clip (si tiene voz) y una lista cronológica de descripciones visuales (una por fotograma). Con eso debes:

1. EVALUAR si es un buen clip (score 0-100) pensando en retención:
   - ¿Hay un momento "wow" claro (golazo, caño humillante, atajada imposible, fail épico, bug gracioso, remontada clutch)?
   - ¿El momento fuerte llega pronto o hay mucho relleno antes? Los primeros 3 segundos deciden el scroll.
   - ¿Hay contexto que suba las apuestas (final de FUT Champions, último minuto, marcador ajustado)?
   - Penaliza: jugadas genéricas, clips donde no pasa nada, gameplay neutro sin remate.
2. DAR UN VEREDICTO: "publicar" (score ≥ 70), "editar" (40-69: tiene potencial pero hay que recortar al momento clave) o "descartar" (< 40).
3. PROPONER un título/caption principal en español, corto y con gancho (estilo TikTok: intriga, exageración honesta o pregunta; emojis con moderación). Y 2 títulos alternativos.
4. PROPONER 8-12 hashtags del nicho: mezcla siempre generales (#eafc, #fc25, #futbol, #gaming, #fyp, #parati) con específicos de la jugada (#golazo, #skills, #caño, #fail, #clutch, #futchampions, #ultimateteam...). Todos en minúsculas y empezando con #.

En "reasoning" explica en 2-3 frases (español) el porqué del score, mencionando el momento clave y dónde está en el tiempo. Responde SOLO con el JSON pedido.`;

export function masterUserPrompt(args: {
  clipTitle: string;
  durationSec: number | null;
  transcript: string | null;
  sceneLines: string[];
}): string {
  const parts: string[] = [];
  parts.push(`CLIP: "${args.clipTitle}"`);
  if (args.durationSec) parts.push(`DURACIÓN: ${args.durationSec} segundos`);
  parts.push(
    args.transcript && args.transcript.trim()
      ? `TRANSCRIPCIÓN DEL AUDIO:\n${args.transcript.trim()}`
      : `TRANSCRIPCIÓN DEL AUDIO: (el clip no tiene voz o no se pudo transcribir; evalúa solo con lo visual)`
  );
  parts.push(
    `DESCRIPCIONES VISUALES (en orden cronológico):\n${
      args.sceneLines.length > 0
        ? args.sceneLines.join("\n")
        : "(no se pudieron describir los fotogramas)"
    }`
  );
  return parts.join("\n\n");
}

// Esquema JSON que Ollama fuerza en la respuesta de la Fase D (structured
// outputs): con un modelo 4B, parsear texto libre es una fuente de bugs.
export const MASTER_RESULT_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    verdict: { type: "string", enum: ["publicar", "editar", "descartar"] },
    reasoning: { type: "string" },
    title: { type: "string" },
    alt_titles: { type: "array", items: { type: "string" }, maxItems: 3 },
    hashtags: { type: "array", items: { type: "string" }, maxItems: 14 },
  },
  required: ["score", "verdict", "reasoning", "title", "alt_titles", "hashtags"],
} as const;
