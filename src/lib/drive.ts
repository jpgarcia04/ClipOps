import { DEFAULT_TARGET_PLATFORMS } from "@/lib/config";
import { prisma } from "@/lib/db";

// ─────────────────────────────────────────────────────────────
// Capa de acceso a Google Drive.
//
// `DriveSource` abstrae "de dónde salen los archivos":
//   • MockDriveSource   → fuente demo (sin credenciales).
//   • GoogleDriveSource → Drive real vía Service Account.
// `getDriveSource()` usa la real si hay credenciales; si no, la demo.
// En ambos casos solo guardamos METADATOS + referencia al archivo, nunca
// el video.
// ─────────────────────────────────────────────────────────────

export type DriveFile = {
  driveFileId: string;
  title: string;
  durationSec?: number;
  thumbnailUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  driveModifiedAt?: Date;
  heightPx?: number; // para derivar la calidad
};

export interface DriveSource {
  readonly name: string;
  listFiles(): Promise<DriveFile[]>;
}

class MockDriveSource implements DriveSource {
  readonly name = "demo";

  async listFiles(): Promise<DriveFile[]> {
    return [
      { driveFileId: "1AbcGolazoMbappe", title: "Golazo de volea con Mbappé en FUT Champions", durationSec: 32, heightPx: 1080 },
      { driveFileId: "2DefSkills", title: "Top 5 skill moves para humillar rivales", durationSec: 48, heightPx: 1080 },
      { driveFileId: "3GhiRemontada", title: "Remontada imposible 0-3 a 4-3 en Division Rivals", durationSec: 55, heightPx: 720 },
      { driveFileId: "4JklPanenka", title: "Penalti panenka para ganar la final", durationSec: 18, heightPx: 1080 },
      { driveFileId: "5MnoBug", title: "Bug hilarante: el portero salió volando", durationSec: 27, heightPx: 720 },
      { driveFileId: "6PqrTiroLibre", title: "Tiro libre imposible al ángulo", durationSec: 24, heightPx: 1080, mimeType: "video/mp4" },
      { driveFileId: "7StuDobleCano", title: "Doble caño y definición de lujo", durationSec: 19, heightPx: 1080, mimeType: "video/mp4" },
      { driveFileId: "8VwxAtajada", title: "Atajadón en el último minuto de la final", durationSec: 33, heightPx: 2160, mimeType: "video/mp4" },
    ];
  }
}

class GoogleDriveSource implements DriveSource {
  readonly name = "google-drive";

  async listFiles(): Promise<DriveFile[]> {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!folderId || !raw) return [];

    const credentials = JSON.parse(
      Buffer.from(raw, "base64").toString("utf8")
    );
    const { google } = await import("googleapis");
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    const drive = google.drive({ version: "v3", auth });

    const res = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'video/' and trashed = false`,
      fields:
        "files(id,name,mimeType,size,thumbnailLink,webViewLink,modifiedTime,videoMediaMetadata)",
      orderBy: "modifiedTime desc",
      pageSize: 200,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    return (res.data.files ?? []).map((f) => ({
      driveFileId: f.id as string,
      title: f.name ?? "Sin nombre",
      durationSec: f.videoMediaMetadata?.durationMillis
        ? Math.round(Number(f.videoMediaMetadata.durationMillis) / 1000)
        : undefined,
      thumbnailUrl: f.thumbnailLink ?? undefined,
      mimeType: f.mimeType ?? undefined,
      sizeBytes: f.size ? Number(f.size) : undefined,
      driveModifiedAt: f.modifiedTime ? new Date(f.modifiedTime) : undefined,
      heightPx: f.videoMediaMetadata?.height ?? undefined,
    }));
  }
}

export function getDriveSource(): DriveSource {
  if (
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON &&
    process.env.GOOGLE_DRIVE_FOLDER_ID
  ) {
    return new GoogleDriveSource();
  }
  return new MockDriveSource();
}

function qualityFromHeight(h?: number): "SD" | "HD" | "FULL_HD" | "UHD_4K" {
  if (!h) return "HD";
  if (h >= 2160) return "UHD_4K";
  if (h >= 1080) return "FULL_HD";
  if (h >= 720) return "HD";
  return "SD";
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
        status: "IDEA",
        type: "SHORT_FORM",
        duration: f.durationSec ?? null,
        quality: qualityFromHeight(f.heightPx),
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
