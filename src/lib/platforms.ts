// Metadatos de las plataformas de publicación (formato corto vertical).
export type PlatformKey = "TIKTOK" | "INSTAGRAM" | "YOUTUBE_SHORTS";

export const PLATFORM_META: Record<
  PlatformKey,
  { label: string; uploadUrl: string; uploadLabel: string }
> = {
  TIKTOK: {
    label: "TikTok",
    uploadUrl: "https://www.tiktok.com/upload",
    uploadLabel: "Nueva publicación",
  },
  INSTAGRAM: {
    label: "Instagram Reels",
    uploadUrl: "https://www.instagram.com/",
    uploadLabel: "Nuevo reel",
  },
  YOUTUBE_SHORTS: {
    label: "YouTube Shorts",
    uploadUrl: "https://www.youtube.com/upload",
    uploadLabel: "Nuevo short",
  },
};

export const PUBLISH_PLATFORMS: PlatformKey[] = [
  "TIKTOK",
  "INSTAGRAM",
  "YOUTUBE_SHORTS",
];
