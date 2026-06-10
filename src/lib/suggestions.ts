// Sugerencias de captions y hashtags derivadas del nombre/tags del clip.
// Reglas por palabra clave (consistentes con el contenido). Más adelante esto
// puede pasar a generación con IA; la interfaz se queda igual.

export type Suggestions = { captions: string[]; hashtags: string[] };

const BASE_HASHTAGS = [
  "#eafc25",
  "#fc25",
  "#fyp",
  "#parati",
  "#gaming",
  "#futbol",
];

type Theme = {
  match: string[];
  captions: string[];
  hashtags: string[];
};

const THEMES: Theme[] = [
  {
    match: ["golazo", "gol", "volea", "tiro", "libre", "screamer", "angulo", "ángulo"],
    captions: [
      "🚨 GOLAZO 🚨 esto pasa cuando no te rindes en el último minuto 🔥",
      "Dime que es el mejor gol que vas a ver hoy… te leo 👇⚽",
      "Cuando entra al ángulo y no lo puedes creer 🤯",
    ],
    hashtags: ["#golazo", "#goal", "#screamer", "#worldie", "#football", "#soccer"],
  },
  {
    match: ["skill", "skills", "caño", "cano", "regate", "humillar"],
    captions: [
      "5 skills que casi nadie usa bien 🧠⚽ ¿cuál vas a practicar?",
      "Guarda esto para tu próxima partida 🔥",
      "El caño más limpio que vas a ver hoy 😮‍💨",
    ],
    hashtags: ["#skills", "#skillmoves", "#tutorial", "#tips", "#nutmeg"],
  },
  {
    match: ["remontada", "clutch", "rivals", "comeback"],
    captions: [
      "POV: vas perdiendo y NO te rindes 😤 la remontada más épica 👇",
      "Nunca te rindas… mira cómo acaba esto 🔥",
      "De perder a ganar en segundos 🤯",
    ],
    hashtags: ["#remontada", "#clutch", "#comeback", "#nevergiveup"],
  },
  {
    match: ["penalti", "panenka", "final"],
    captions: [
      "Frialdad absoluta para ganar la FINAL 🥶",
      "¿Tú tendrías el valor para esta panenka en la final? 😅",
      "Así se gana una final 🏆",
    ],
    hashtags: ["#penalti", "#panenka", "#final", "#clutch"],
  },
  {
    match: ["bug", "fail", "gracioso", "portero", "meme", "risa"],
    captions: [
      "EA FC nunca decepciona 😂 mira lo que hizo el portero 🤣",
      "Esto no debería pasar pero pasó jajaja 💀",
      "El bug más gracioso del año 😭",
    ],
    hashtags: ["#fail", "#bug", "#funny", "#lol", "#meme", "#gamingfails"],
  },
];

export function getSuggestions(clip: {
  title: string;
  tags: string[];
}): Suggestions {
  const haystack = `${clip.title} ${clip.tags.join(" ")}`.toLowerCase();
  const matched = THEMES.filter((t) => t.match.some((m) => haystack.includes(m)));
  const themes = matched.length > 0 ? matched : [THEMES[0]];

  const captions = Array.from(
    new Set(themes.flatMap((t) => t.captions))
  ).slice(0, 3);

  const hashtags = Array.from(
    new Set([...themes.flatMap((t) => t.hashtags), ...BASE_HASHTAGS])
  ).slice(0, 14);

  return { captions, hashtags };
}
