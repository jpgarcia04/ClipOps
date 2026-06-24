import { prisma } from "@/lib/db";
import { getDriveAccessToken } from "@/lib/drive";

// GET /api/clips/[id]/video — sirve (stream) el video del clip desde Drive
// usando la cuenta de servicio. Funciona en cualquier navegador, sin depender
// de la sesión de Google del usuario.
//   ?download=1  → fuerza descarga con el nombre del clip en la app.
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const clip = await prisma.clip.findUnique({
    where: { id: params.id },
    select: { driveFileId: true, title: true, mimeType: true },
  });

  if (!clip?.driveFileId) {
    return new Response("Clip sin archivo de Drive (¿es un clip demo?).", {
      status: 404,
    });
  }

  const token = await getDriveAccessToken();
  if (!token) {
    return new Response("Drive no está configurado.", { status: 503 });
  }

  const range = req.headers.get("range");
  const driveRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${clip.driveFileId}?alt=media&supportsAllDrives=true`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(range ? { Range: range } : {}),
      },
    }
  );

  if (!driveRes.ok && driveRes.status !== 206) {
    return new Response("No se pudo obtener el video.", {
      status: driveRes.status,
    });
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    driveRes.headers.get("content-type") ?? clip.mimeType ?? "video/mp4"
  );
  headers.set("Accept-Ranges", "bytes");
  const len = driveRes.headers.get("content-length");
  if (len) headers.set("Content-Length", len);
  const contentRange = driveRes.headers.get("content-range");
  if (contentRange) headers.set("Content-Range", contentRange);

  const download = new URL(req.url).searchParams.get("download");
  if (download) {
    const base = clip.title || "clip";
    const ascii = base.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "clip";
    const encoded = encodeURIComponent(`${base}.mp4`);
    headers.set(
      "Content-Disposition",
      `attachment; filename="${ascii}.mp4"; filename*=UTF-8''${encoded}`
    );
  }

  return new Response(driveRes.body, { status: driveRes.status, headers });
}
