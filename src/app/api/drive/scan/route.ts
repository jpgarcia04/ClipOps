import { NextResponse } from "next/server";

import { syncNewClipsFromDrive } from "@/lib/drive";

// POST /api/drive/scan — busca clips nuevos en Drive y los registra como
// pendientes. Lo dispara el botón "Buscar en Drive" de la página de Clips;
// más adelante también podría llamarlo un cron para sincronizar solo.
export async function POST() {
  try {
    const result = await syncNewClipsFromDrive();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[drive/scan] error:", error);
    return NextResponse.json(
      { error: "No se pudo sincronizar con Drive." },
      { status: 500 }
    );
  }
}
