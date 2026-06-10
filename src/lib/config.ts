import type { Platform } from "@prisma/client";

// Los dos creadores. Lista fija para el campo "responsable" (flujo estricto:
// se elige de aquí, no es texto libre).
export const RESPONSIBLES = ["Jp", "Topo"] as const;
export type Responsible = (typeof RESPONSIBLES)[number];

// Plataformas a las que, por defecto, se planea subir un clip nuevo.
export const DEFAULT_TARGET_PLATFORMS: Platform[] = [
  "TIKTOK",
  "INSTAGRAM",
  "YOUTUBE_SHORTS",
];
