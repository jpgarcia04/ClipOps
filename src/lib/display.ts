import type { BadgeProps } from "@/components/ui/badge";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

export const clipStatusLabels: Record<string, string> = {
  IDEA: "Idea",
  RECORDING: "Grabando",
  EDITING: "Edición",
  READY: "Listo",
  PUBLISHED: "Publicado",
  ARCHIVED: "Archivado",
};

export const clipTypeLabels: Record<string, string> = {
  SHORT_FORM: "Short",
  LONG_FORM: "Largo",
  REEL: "Reel",
  STORY: "Story",
  TUTORIAL: "Tutorial",
  INTERVIEW: "Entrevista",
  PROMO: "Promo",
  OTHER: "Otro",
};

export const clipQualityLabels: Record<string, string> = {
  SD: "SD",
  HD: "HD",
  FULL_HD: "Full HD",
  UHD_4K: "4K",
};

export const platformLabels: Record<string, string> = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  YOUTUBE_SHORTS: "YT Shorts",
  FACEBOOK: "Facebook",
  X: "X",
  LINKEDIN: "LinkedIn",
  THREADS: "Threads",
};

export const postStatusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  READY: "Listo",
  SCHEDULED: "Agendado",
  PUBLISHED: "Publicado",
  FAILED: "Falló",
  ARCHIVED: "Archivado",
};

export function clipStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "PUBLISHED":
      return "default";
    case "ARCHIVED":
      return "outline";
    default:
      return "secondary";
  }
}

export function postStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "PUBLISHED":
      return "default";
    case "FAILED":
      return "destructive";
    case "ARCHIVED":
      return "outline";
    default:
      return "secondary";
  }
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
