import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";

import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { PwaRegister } from "@/components/pwa-register";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export const metadata: Metadata = {
  title: "ClipOps — Content Operations",
  description:
    "Gestiona clips, cola de publicación, captions y métricas en un solo lugar.",
  applicationName: "ClipOps",
  appleWebApp: {
    capable: true,
    title: "ClipOps",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#030215",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AppShell userName={session?.name ?? null}>{children}</AppShell>
        <PwaRegister />
      </body>
    </html>
  );
}
