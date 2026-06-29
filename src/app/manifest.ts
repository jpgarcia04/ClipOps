import type { MetadataRoute } from "next";

// Manifest de la PWA. Next.js lo sirve en /manifest.webmanifest y lo enlaza
// automáticamente en el <head>. Con display "standalone" la app se instala
// con su propio ícono y ventana, sin la barra del navegador.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ClipOps — Content Operations",
    short_name: "ClipOps",
    description:
      "Centro de control de clips: Drive, cola de publicación, captions y métricas.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    background_color: "#030215",
    theme_color: "#030215",
    lang: "es",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
