import { DEFAULT_TARGET_PLATFORMS } from "@/lib/config";
import { prisma } from "@/lib/db";

// ─────────────────────────────────────────────────────────────
// Capa de acceso a Google Drive.
//
// `DriveSource` abstrae "de dónde salen los archivos". Hoy usamos una
// fuente DEMO (simulada) para poder ver el flujo completo sin credenciales.
// Cuando conectemos Google Drive de verdad, basta con implementar
// `GoogleDriveSource` y devolverla en `getDriveSource()`. Nada más cambia:
// el botón, el deduplicado por driveFileId y el alta como pendiente se quedan.
// ─────────────────────────────────────────────────────────────

export type DriveFile = {
  driveFileId: string;
  title: string;
  durationSec?: number;
  thumbnailUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  driveModifiedAt?: Date;
};

export interface DriveSource {
  /** Etiqueta legible de la fuente (p. ej. "demo" o "google-drive"). */
  readonly name: string;
  /** Lista los archivos de video de la carpeta vigilada. */
  listFiles(): Promise<DriveFile[]>;
}

// Fuente simulada: imita lo que devolvería Drive. Incluye archivos que ya
// existen en la app (para demostrar el deduplicado) y algunos nuevos.
class MockDriveSource implements DriveSource {
  readonly name = "demo";

  async listFiles(): Promise<DriveFile[]> {
    return [
      // Ya existentes (se ignoran al sincronizar).
      { driveFileId: "1AbcGolazoMbappe", title: "Golazo de volea con Mbappé en FUT Champions", durationSec: 32 },
      { driveFileId: "2DefSkills", title: "Top 5 skill moves para humillar rivales", durationSec: 48 },
      { driveFileId: "3GhiRemontada", title: "Remontada imposible 0-3 a 4-3 en Division Rivals", durationSec: 55 },
      { driveFileId: "4JklPanenka", title: "Penalti panenka para ganar la final", durationSec: 18 },
      { driveFileId: "5MnoBug", title: "Bug hilarante: el portero salió volando", durationSec: 27 },
      // Nuevos (aparecerán como pendientes).
      { driveFileId: "6PqrTiroLibre", title: "Tiro libre imposible al ángulo", durationSec: 24, mimeType: "video/mp4" },
      { driveFileId: "7StuDobleCano", title: "Doble caño y definición de lujo", durationSec: 19, mimeType: "video/mp4" },
      { driveFileId: "8VwxAtajada", title: "Atajadón en el último minuto de la final", durationSec: 33, mimeType: "video/mp4" },
    ];
  }
}

export function getDriveSource(): DriveSource {
  // TODO: cuando existan credenciales de Google (env GOOGLE_*), devolver
  // una GoogleDriveSource real en lugar de la demo.
  return new MockDriveSource();
}

export type SyncResult = {
  source: string;
  created: number;
  skipped: number;
  titles: string[];
};

/**
 * Descubre clips nuevos en Drive y los registra como PENDIENTES (status IDEA).
 * Deduplica por `driveFileId`, así que es seguro ejecutarlo cuantas veces sea.
 */
export async function syncNewClipsFromDrive(): Promise<SyncResult> {
  const source = getDriveSource();
  const files = await source.listFiles();
  const ids = files.map((f) => f.driveFileId);

  const existing = await prisma.clip.findMany({
    where: { driveFileId: { in: ids } },
    select: { driveFileId: true },
  });
  const existingIds = new Set(existing.map((e) => e.driveFileId));

  const nuevos = files.filter((f) => !existingIds.has(f.driveFileId));

  if (nuevos.length > 0) {
    await prisma.clip.createMany({
      data: nuevos.map((f) => ({
        title: f.title,
        driveLink: `https://drive.google.com/file/d/${f.driveFileId}/view`,
        driveFileId: f.driveFileId,
        status: "IDEA", // pendiente de organizar/publicar
        type: "SHORT_FORM",
        duration: f.durationSec ?? null,
        thumbnailUrl: f.thumbnailUrl ?? null,
        mimeType: f.mimeType ?? "video/mp4",
        sizeBytes: f.sizeBytes ?? null,
        driveModifiedAt: f.driveModifiedAt ?? null,
        targetPlatforms: DEFAULT_TARGET_PLATFORMS,
      })),
      skipDuplicates: true,
    });
  }

  return {
    source: source.name,
    created: nuevos.length,
    skipped: files.length - nuevos.length,
    titles: nuevos.map((n) => n.title),
  };
}
