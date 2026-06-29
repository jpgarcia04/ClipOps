"use client";

import { useEffect } from "react";

// Registra el service worker para habilitar la instalación de la PWA.
// No renderiza nada.
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Silencioso: si falla, la app sigue funcionando como web normal.
      });
    }
  }, []);

  return null;
}
