import { prisma } from "@/lib/db";

// GET/POST /api/clips/[id]/analysis — guarda y sirve el resultado del
// análisis con IA local. Solo texto (unos KB): el video nunca toca el VPS.

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const analysis = await prisma.clipAnalysis.findUnique({
    where: { clipId: params.id },
  });
  if (!analysis) return new Response(null, { status: 404 });
  return Response.json(analysis);
}

const VERDICTS = new Set(["publicar", "editar", "descartar"]);

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const clip = await prisma.clip.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!clip) return new Response("Clip no encontrado.", { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("JSON inválido.", { status: 400 });
  }

  const score = Math.round(Number(body.score));
  const verdict = String(body.verdict ?? "");
  const title = String(body.title ?? "").trim();
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return new Response("score inválido.", { status: 400 });
  }
  if (!VERDICTS.has(verdict)) {
    return new Response("verdict inválido.", { status: 400 });
  }
  if (!title) return new Response("title requerido.", { status: 400 });

  const strings = (v: unknown) =>
    Array.isArray(v) ? v.map(String).filter(Boolean).slice(0, 20) : [];

  const data = {
    score,
    verdict,
    reasoning: String(body.reasoning ?? ""),
    title,
    altTitles: strings(body.altTitles),
    hashtags: strings(body.hashtags),
    transcript: body.transcript ? String(body.transcript) : null,
    visualSummary: body.visualSummary ? String(body.visualSummary) : null,
    model: String(body.model ?? "desconocido"),
  };

  const analysis = await prisma.clipAnalysis.upsert({
    where: { clipId: params.id },
    create: { clipId: params.id, ...data },
    update: data,
  });

  return Response.json(analysis);
}
