"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarBrand, SidebarNav } from "./sidebar";

export function AppShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Las pantallas de auth se muestran sin el shell (sidebar/topbar).
  if (pathname === "/login" || pathname === "/register") {
    return <>{children}</>;
  }

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  const footer = (
    <div className="flex items-center justify-between gap-2 p-4">
      <span className="truncate text-xs text-muted-foreground">
        {userName ? `Hola, ${userName}` : "v0.1.0 · dev"}
      </span>
      {userName ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="h-7 gap-1 px-2 text-xs"
        >
          <LogOut className="h-3.5 w-3.5" /> Salir
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card lg:flex">
        <SidebarBrand />
        <Separator />
        <div className="flex-1 overflow-y-auto py-4">
          <SidebarNav />
        </div>
        <Separator />
        {footer}
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b bg-card px-4 py-3 lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navegación</SheetTitle>
              <SidebarBrand />
              <Separator />
              <div className="py-4">
                <SidebarNav onNavigate={() => setOpen(false)} />
              </div>
              <Separator />
              {footer}
            </SheetContent>
          </Sheet>
          <span className="font-semibold">ClipOps</span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
