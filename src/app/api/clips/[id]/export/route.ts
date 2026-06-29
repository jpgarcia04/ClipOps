import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { prisma } from "@/lib/db";
import { getDriveAccessToken } from "@/lib/drive";
import { hasEdits, parseEdit, type TextOverlay } from "@/lib/edit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/clips/[id]/export — aplica la edición no-destructiva (recorte +
// textos + mute) con ffmpeg y devuelve el MP4 listo para subir. El original
// en Drive nunca se modifica. Si el clip no tiene ediciones, redirige a la
// descarga del original.

function run(cmd: string, args: string[]): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args);
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 0, stderr }));
  });
}

// Resuelve la ruta de una fuente DejaVu (regular/negrita) según dónde la dejó
// el paquete ttf-dejavu, con varios candidatos por compatibilidad.
function findFont(bold: boolean): string | null {
  const names = bold
    ? ["DejaVuSans-Bold.ttf", "DejaVuSansCondensed-Bold.ttf"]
    : ["DejaVuSans.ttf", "DejaVuSansCondensed.ttf"];
  const dirs = [
    "/usr/share/fonts/ttf-dejavu",
    "/usr/share/fonts/dejavu",
    "/usr/share/fonts/truetype/dejavu",
    "/usr/share/fonts/TTF",
  ];
  for (const d of dirs) {
    for (const n of names) {
      const p = join(d, n);
      if (existsSync(p)) return p;
    }
  }
  return null;
}

// Escapa lo que va dentro de un valor de filtro (para el filtergraph de ffmpeg).
function esc(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const clip = await prisma.clip.findUnique({
    where: { id: params.id },
    select: { driveFileId: true, title: true, edit: true },
  });

  if (!clip?.driveFileId) {
    return new Response("Clip sin archivo de Drive.", { status: 404 });
  }

  const edit = parseEdit(clip.edit);

  // Sin ediciones reales → descarga el original tal cual.
  if (!hasEdits(edit)) {
    return Response.redirect(
      new URL(`/api/clips/${params.id}/video?download=1`, req.url),
      302
    );
  }

  const token = await getDriveAccessToken();
  if (!token) return new Response("Drive no está configurado.", { status: 503 });

  const driveRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${clip.driveFileId}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!driveRes.ok) {
    return new Response("No se pudo obtener el video de Drive.", {
      status: driveRes.status,
    });
  }

  const work = await mkdtemp(join(tmpdir(), "clipops-"));
  const inPath = join(work, "in.mp4");
  const outPath = join(work, "out.mp4");

  try {
    const buf = Buffer.from(await driveRes.arrayBuffer());
    await writeFile(inPath, buf);

    // Dimensiones del video (para tamaño de fuente y posiciones).
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const child = spawn("ffprobe", [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height",
        "-of",
        "csv=p=0",
        inPath,
      ]);
      let out = "";
      child.stdout.on("data", (d) => (out += d.toString()));
      child.on("close", () => {
        const [w, h] = out.trim().split(",").map((n) => parseInt(n, 10));
        resolve({ w: w || 1080, h: h || 1920 });
      });
      child.on("error", () => resolve({ w: 1080, h: 1920 }));
    });

    const H = dims.h;

    const hasTrim = edit.trimStart != null || edit.trimEnd != null;
    const start = edit.trimStart ?? 0;

    // ── Construye los filtros drawtext ──
    const fontReg = findFont(false);
    const fontBold = findFont(true);
    const overlays = edit.overlays.filter((o) => o.text.trim().length > 0);

    const drawFilters: string[] = [];
    for (let i = 0; i < overlays.length; i++) {
      const o: TextOverlay = overlays[i];
      const txtPath = join(work, `ov_${i}.txt`);
      await writeFile(txtPath, o.text, "utf8");

      const font = (o.bold ? fontBold : fontReg) ?? fontReg ?? fontBold;
      const fontSize = Math.max(10, Math.round(H * o.sizePct));
      const color = o.color.startsWith("#")
        ? `0x${o.color.slice(1)}`
        : o.color;
      const x = `(w*${o.xPct.toFixed(4)})-(text_w/2)`;
      const y = `(h*${o.yPct.toFixed(4)})-(text_h/2)`;

      const parts = [
        "drawtext=" + (font ? `fontfile=${esc(font)}:` : "") + `textfile=${esc(txtPath)}`,
        "expansion=none",
        `fontsize=${fontSize}`,
        `fontcolor=${color}`,
        `x=${x}`,
        `y=${y}`,
      ];
      if (o.bg) {
        parts.push("box=1", "boxcolor=black@0.55", `boxborderw=${Math.round(fontSize * 0.25)}`);
      }
      // Tiempos relativos al recorte (tras -ss). Comas escapadas para el graph.
      const from = o.start != null ? Math.max(0, o.start - start) : null;
      const to = o.end != null ? Math.max(0, o.end - start) : null;
      if (from != null || to != null) {
        const f = from ?? 0;
        const t = to ?? 999999;
        parts.push(`enable=between(t\\,${f.toFixed(2)}\\,${t.toFixed(2)})`);
      }
      drawFilters.push(parts.join(":"));
    }

    // ── Arma los argumentos de ffmpeg ──
    const args: string[] = ["-hide_banner", "-loglevel", "error"];
    if (start > 0) args.push("-ss", String(start));
    args.push("-i", inPath);
    if (hasTrim) {
      const end = edit.trimEnd ?? Infinity;
      const dur = end - start;
      if (Number.isFinite(dur) && dur > 0) args.push("-t", String(dur));
    }
    if (drawFilters.length > 0) args.push("-vf", drawFilters.join(","));
    args.push(
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p"
    );
    if (edit.muted) args.push("-an");
    else args.push("-c:a", "aac", "-b:a", "128k");
    args.push("-movflags", "+faststart", "-y", outPath);

    const result = await run("ffmpeg", args);
    if (result.code !== 0 || !existsSync(outPath)) {
      console.error("[clips/export] ffmpeg falló:", result.stderr.slice(-1500));
      return new Response("No se pudo exportar el video.", { status: 500 });
    }

    const outBuf = await readFile(outPath);
    const base = (clip.title || "clip").replace(/[^\w.\-]+/g, "_").slice(0, 70) || "clip";

    return new Response(outBuf, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(outBuf.length),
        "Content-Disposition": `attachment; filename="${base}-editado.mp4"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return new Response(
        "ffmpeg no está disponible en el servidor.",
        { status: 501 }
      );
    }
    console.error("[clips/export]", error);
    return new Response("Error al exportar.", { status: 500 });
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }
}
