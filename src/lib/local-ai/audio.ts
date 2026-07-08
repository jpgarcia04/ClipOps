// Extracción de audio 100% en el navegador (whisper.cpp no come MP4: espera
// WAV PCM 16-bit 16kHz mono). El navegador decodifica la pista de audio del
// video con Web Audio, remuestreamos con OfflineAudioContext y codificamos el
// WAV a mano (~30 líneas, sin dependencias).

const WHISPER_SAMPLE_RATE = 16000;

// Devuelve el audio del video como WAV 16kHz mono, o null si el video no
// tiene pista de audio decodificable (clip mudo → seguimos solo con visión).
export async function extractWavAudio(videoBlob: Blob): Promise<Blob | null> {
  const arrayBuffer = await videoBlob.arrayBuffer();

  const AudioContextCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const ctx = new AudioContextCtor();

  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(arrayBuffer);
  } catch {
    return null; // sin audio (o códec no soportado): degradamos a solo-visión
  } finally {
    void ctx.close();
  }

  // Remuestreo a 16kHz mono: renderizamos el buffer decodificado dentro de un
  // OfflineAudioContext con la tasa que whisper espera.
  const length = Math.ceil(decoded.duration * WHISPER_SAMPLE_RATE);
  if (length === 0) return null;
  const offline = new OfflineAudioContext(1, length, WHISPER_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();

  return encodeWav(rendered.getChannelData(0), WHISPER_SAMPLE_RATE);
}

// PCM float32 [-1, 1] → WAV 16-bit little-endian.
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const dataLength = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // tamaño del sub-chunk fmt
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits por sample
  writeString(36, "data");
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}
