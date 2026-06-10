// ─────────────────────────────────────────────────────────────
// ClipOps — datos de ejemplo (EA Sports FC).
// Idempotente en desarrollo: limpia y vuelve a crear.
//   Ejecutar con:  npm run db:seed   (o  npx prisma db seed)
// ─────────────────────────────────────────────────────────────
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const now = new Date();
const day = (delta) => {
  const d = new Date(now);
  d.setDate(d.getDate() + delta);
  return d;
};

async function main() {
  // Limpia para que el seed sea repetible.
  await prisma.postMetric.deleteMany();
  await prisma.post.deleteMany();
  await prisma.clip.deleteMany();

  // 1 ── Golazo: publicado en TikTok + IG, agendado HOY en YT Shorts.
  await prisma.clip.create({
    data: {
      title: "Golazo de volea con Mbappé en FUT Champions",
      driveLink: "https://drive.google.com/file/d/1AbcGolazoMbappe/view",
      driveFileId: "1AbcGolazoMbappe",
      status: "PUBLISHED",
      type: "SHORT_FORM",
      duration: 32,
      quality: "FULL_HD",
      tags: ["ea fc 25", "golazo", "mbappe", "fut champions"],
      responsible: "Jp",
      targetPlatforms: ["TIKTOK", "INSTAGRAM", "YOUTUBE_SHORTS"],
      notes: "El mejor clip de la semana, empujarlo fuerte.",
      posts: {
        create: [
          {
            platform: "TIKTOK",
            status: "PUBLISHED",
            caption: "¡VOLEA IMPOSIBLE de Mbappé! 🚀⚽",
            hashtags: ["#eafc25", "#golazo", "#futchampions", "#fyp"],
            audio: "Sonido original - viral gaming",
            publishedDate: day(-3),
            url: "https://www.tiktok.com/@clipops/video/1111",
            externalId: "tt_1111",
            responsible: "Jp",
            metrics: {
              create: [
                { capturedAt: day(-2), views: 12400, likes: 1820, comments: 96, shares: 240, saves: 310, watchSec: 18 },
                { capturedAt: day(-1), views: 28900, likes: 4100, comments: 210, shares: 560, saves: 720, watchSec: 19 },
              ],
            },
          },
          {
            platform: "INSTAGRAM",
            status: "PUBLISHED",
            caption: "Volea de otro planeta 🌍🔥",
            hashtags: ["#eafc25", "#reels", "#golazo"],
            audio: "Trending audio - hype",
            publishedDate: day(-3),
            url: "https://www.instagram.com/reel/2222",
            externalId: "ig_2222",
            responsible: "Jp",
            metrics: {
              create: [
                { capturedAt: day(-1), views: 8600, likes: 990, comments: 41, shares: 130, saves: 205, watchSec: 16 },
              ],
            },
          },
          {
            platform: "YOUTUBE_SHORTS",
            status: "SCHEDULED",
            caption: "El mejor gol que vas a ver hoy 🤯 #shorts",
            hashtags: ["#shorts", "#eafc25", "#golazo"],
            plannedDate: now, // hoy → aparece en Today Ops
            responsible: "Topo",
          },
        ],
      },
    },
  });

  // 2 ── Skills: listo para HOY en TikTok, borrador en IG.
  await prisma.clip.create({
    data: {
      title: "Top 5 skill moves para humillar rivales",
      driveLink: "https://drive.google.com/file/d/2DefSkills/view",
      driveFileId: "2DefSkills",
      status: "READY",
      type: "REEL",
      duration: 48,
      quality: "FULL_HD",
      tags: ["skills", "tutorial", "ea fc 25"],
      responsible: "Topo",
      targetPlatforms: ["TIKTOK", "INSTAGRAM", "YOUTUBE_SHORTS"],
      posts: {
        create: [
          {
            platform: "TIKTOK",
            status: "READY",
            caption: "Guarda estos 5 skills 🧠🔥 ¿cuál usas más?",
            hashtags: ["#eafc25", "#skills", "#tutorial", "#fyp"],
            audio: "Beat trending",
            plannedDate: now, // hoy
            responsible: "Topo",
          },
          {
            platform: "INSTAGRAM",
            status: "DRAFT",
            caption: "5 skills que cambian partidos",
            hashtags: ["#eafc25", "#reels", "#skills"],
            responsible: "Topo",
          },
        ],
      },
    },
  });

  // 3 ── Remontada: en edición, SIN posts → "falta por subir".
  await prisma.clip.create({
    data: {
      title: "Remontada imposible 0-3 a 4-3 en Division Rivals",
      driveLink: "https://drive.google.com/file/d/3GhiRemontada/view",
      driveFileId: "3GhiRemontada",
      status: "EDITING",
      type: "SHORT_FORM",
      duration: 55,
      quality: "HD",
      tags: ["remontada", "rivals", "clutch"],
      responsible: "Jp",
      targetPlatforms: ["TIKTOK", "YOUTUBE_SHORTS"],
      notes: "Cortar la celebración final, queda muy largo.",
    },
  });

  // 4 ── Penalti panenka: publicado TikTok + YT; agendado IG (ATRASADO).
  await prisma.clip.create({
    data: {
      title: "Penalti panenka para ganar la final",
      driveLink: "https://drive.google.com/file/d/4JklPanenka/view",
      driveFileId: "4JklPanenka",
      status: "PUBLISHED",
      type: "SHORT_FORM",
      duration: 18,
      quality: "FULL_HD",
      tags: ["penalti", "panenka", "final", "clutch"],
      responsible: "Topo",
      targetPlatforms: ["TIKTOK", "INSTAGRAM", "YOUTUBE_SHORTS"],
      posts: {
        create: [
          {
            platform: "TIKTOK",
            status: "PUBLISHED",
            caption: "Panenka para ganar la FINAL 🥶",
            hashtags: ["#eafc25", "#penalti", "#clutch", "#fyp"],
            publishedDate: day(-6),
            url: "https://www.tiktok.com/@clipops/video/3333",
            externalId: "tt_3333",
            responsible: "Topo",
            metrics: {
              create: [
                { capturedAt: day(-5), views: 45200, likes: 8300, comments: 410, shares: 1200, saves: 1500, watchSec: 15 },
                { capturedAt: day(-1), views: 91000, likes: 15400, comments: 720, shares: 2600, saves: 3100, watchSec: 16 },
              ],
            },
          },
          {
            platform: "YOUTUBE_SHORTS",
            status: "PUBLISHED",
            caption: "Frialdad absoluta en la final ❄️ #shorts",
            hashtags: ["#shorts", "#eafc25", "#penalti"],
            publishedDate: day(-6),
            url: "https://youtube.com/shorts/4444",
            externalId: "yt_4444",
            responsible: "Topo",
            metrics: {
              create: [
                { capturedAt: day(-1), views: 22300, likes: 1900, comments: 88, shares: 140, saves: 260, watchSec: 14 },
              ],
            },
          },
          {
            platform: "INSTAGRAM",
            status: "SCHEDULED",
            caption: "La panenka más fría 🥶",
            hashtags: ["#eafc25", "#reels", "#penalti"],
            plannedDate: day(-2), // atrasado
            responsible: "Jp",
          },
        ],
      },
    },
  });

  // 5 ── Bug gracioso: idea, sin posts.
  await prisma.clip.create({
    data: {
      title: "Bug hilarante: el portero salió volando",
      driveLink: "https://drive.google.com/file/d/5MnoBug/view",
      driveFileId: "5MnoBug",
      status: "IDEA",
      type: "SHORT_FORM",
      duration: 27,
      quality: "HD",
      tags: ["bug", "fail", "gracioso"],
      responsible: "Jp",
      targetPlatforms: ["TIKTOK", "INSTAGRAM"],
      notes: "Puede explotar por lo gracioso. Buscar audio meme.",
    },
  });

  const [clips, posts, metrics] = await Promise.all([
    prisma.clip.count(),
    prisma.post.count(),
    prisma.postMetric.count(),
  ]);
  console.log(`✅ Seed listo: ${clips} clips, ${posts} posts, ${metrics} métricas.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed falló:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
