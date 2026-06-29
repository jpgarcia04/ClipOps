// Tipos y helpers de la edición no-destructiva de un clip.
// El mismo modelo lo usan: el editor (UI), la API que guarda, y el export
// con ffmpeg. Las posiciones se guardan en fracciones (0..1) del video para
// que sean independientes de la resolución real.

export type TextOverlay = {
  id: string;
  text: string;
  xPct: number; // centro X, 0..1 (0 izquierda, 1 derecha)
  yPct: number; // centro Y, 0..1 (0 arriba, 1 abajo)
  sizePct: number; // tamaño de fuente como fracción de la altura (ej. 0.07)
  color: string; // color del texto, hex (#ffffff)
  bg: boolean; // caja/píldora de fondo semitransparente detrás del texto
  bold: boolean; // negrita
  start: number | null; // segundo en que aparece (null = desde el inicio)
  end: number | null; // segundo en que desaparece (null = hasta el final)
};

export type ClipEditData = {
  trimStart: number | null;
  trimEnd: number | null;
  muted: boolean;
  overlays: TextOverlay[];
};

export const EMPTY_EDIT: ClipEditData = {
  trimStart: null,
  trimEnd: null,
  muted: false,
  overlays: [],
};

export const OVERLAY_COLORS = [
  "#ffffff",
  "#000000",
  "#facc15", // amarillo
  "#22d3ee", // cian
  "#a855f7", // violeta marca
  "#ef4444", // rojo
  "#22c55e", // verde
];

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function num(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Normaliza un overlay venido de JSON/cliente a algo seguro y completo.
export function normalizeOverlay(raw: unknown, i = 0): TextOverlay | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const text = typeof o.text === "string" ? o.text : "";
  return {
    id: typeof o.id === "string" ? o.id : `ov_${Date.now()}_${i}`,
    text,
    xPct: clamp01(Number(o.xPct ?? 0.5)),
    yPct: clamp01(Number(o.yPct ?? 0.5)),
    sizePct: Math.min(0.25, Math.max(0.03, Number(o.sizePct ?? 0.07))),
    color: typeof o.color === "string" ? o.color : "#ffffff",
    bg: Boolean(o.bg),
    bold: o.bold === undefined ? true : Boolean(o.bold),
    start: num(o.start),
    end: num(o.end),
  };
}

// Convierte lo guardado en la DB (Json) a un ClipEditData seguro.
export function parseEdit(raw: {
  trimStart: number | null;
  trimEnd: number | null;
  muted: boolean;
  overlays: unknown;
} | null | undefined): ClipEditData {
  if (!raw) return { ...EMPTY_EDIT };
  const overlaysArr = Array.isArray(raw.overlays) ? raw.overlays : [];
  return {
    trimStart: num(raw.trimStart),
    trimEnd: num(raw.trimEnd),
    muted: Boolean(raw.muted),
    overlays: overlaysArr
      .map((o, i) => normalizeOverlay(o, i))
      .filter((o): o is TextOverlay => o !== null),
  };
}

// ¿La edición tiene algún cambio real respecto al video original?
export function hasEdits(e: ClipEditData): boolean {
  return (
    e.trimStart != null ||
    e.trimEnd != null ||
    e.muted ||
    e.overlays.some((o) => o.text.trim().length > 0)
  );
}
