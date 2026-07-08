// Cliente del whisper-server de whisper.cpp (POST /inference, multipart).
// El server ya responde con Access-Control-Allow-Origin: * de fábrica.

export async function transcribe(args: {
  whisperUrl: string;
  wav: Blob;
  signal: AbortSignal;
}): Promise<string> {
  const form = new FormData();
  form.append("file", args.wav, "audio.wav");
  form.append("response_format", "json");
  // El server usa "en" por defecto; auto-detección para clips en español,
  // inglés o mezcla (comentaristas del juego).
  form.append("language", "auto");

  // Timeout proporcional al audio: ~2 min de margen + el propio abort del
  // pipeline. AbortSignal.any combina cancelación del usuario y timeout.
  const timeout = AbortSignal.timeout(180_000);
  const signal =
    "any" in AbortSignal
      ? AbortSignal.any([args.signal, timeout])
      : args.signal;

  const res = await fetch(`${args.whisperUrl}/inference`, {
    method: "POST",
    body: form,
    signal,
  });
  if (!res.ok) {
    throw new Error(`whisper.cpp respondió ${res.status}.`);
  }
  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}
