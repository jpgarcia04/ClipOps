// Extracción de fotogramas con <canvas> (sin FFmpeg, para no gastar VRAM):
// 1 frame cada ~2s, reescalado a 640px de ancho y codificado a JPEG. Los
// modelos de visión reescalan internamente, así que mandar 1080p solo
// inflaría el payload en base64.

export type Frame = {
  timeSec: number;
  base64: string; // JPEG en base64 SIN el prefijo data: (así lo pide Ollama)
};

const FRAME_INTERVAL_SEC = 2;
const MAX_FRAMES = 45; // tope para clips largos: se abre el intervalo
const TARGET_WIDTH = 640;
const JPEG_QUALITY = 0.7;
const SEEK_TIMEOUT_MS = 10000;

export async function extractFrames(
  videoUrl: string,
  signal: AbortSignal,
  onProgress?: (done: number, total: number) => void
): Promise<Frame[]> {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = videoUrl;

  try {
    await waitForEvent(video, "loadeddata", signal);

    const duration = video.duration;
    if (!isFinite(duration) || duration <= 0) {
      throw new Error("No se pudo leer la duración del video.");
    }

    const interval = Math.max(FRAME_INTERVAL_SEC, duration / MAX_FRAMES);
    const times: number[] = [];
    for (let t = 0.5; t < duration - 0.2; t += interval) times.push(t);
    if (times.length === 0) times.push(Math.min(0.5, duration / 2));

    const scale = Math.min(1, TARGET_WIDTH / (video.videoWidth || TARGET_WIDTH));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round((video.videoWidth || TARGET_WIDTH) * scale);
    canvas.height = Math.round((video.videoHeight || TARGET_WIDTH) * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D no disponible.");

    const frames: Frame[] = [];
    for (let i = 0; i < times.length; i++) {
      throwIfAborted(signal);
      video.currentTime = times[i];
      await waitForEvent(video, "seeked", signal);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
      frames.push({
        timeSec: Math.round(times[i]),
        base64: dataUrl.slice(dataUrl.indexOf(",") + 1),
      });
      onProgress?.(i + 1, times.length);
    }
    return frames;
  } finally {
    // Soltamos el elemento para que el navegador libere el decoder.
    video.removeAttribute("src");
    video.load();
  }
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException("Cancelado", "AbortError");
}

function waitForEvent(
  video: HTMLVideoElement,
  event: "loadeddata" | "seeked",
  signal: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener(event, onOk);
      video.removeEventListener("error", onErr);
      signal.removeEventListener("abort", onAbort);
      clearTimeout(timer);
    };
    const onOk = () => (cleanup(), resolve());
    const onErr = () =>
      (cleanup(), reject(new Error("El navegador no pudo decodificar el video.")));
    const onAbort = () =>
      (cleanup(), reject(new DOMException("Cancelado", "AbortError")));
    const timer = setTimeout(
      () => (cleanup(), reject(new Error(`Timeout esperando "${event}".`))),
      SEEK_TIMEOUT_MS
    );
    video.addEventListener(event, onOk, { once: true });
    video.addEventListener("error", onErr, { once: true });
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
