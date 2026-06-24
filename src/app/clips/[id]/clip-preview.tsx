"use client";

import * as React from "react";
import { Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function ClipPreview({ clipId }: { clipId: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Play className="h-4 w-4" /> Previsualizar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-auto max-w-[96vw] border-0 bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">Previsualización del clip</DialogTitle>
          {open ? (
            <video
              src={`/api/clips/${clipId}/video`}
              controls
              autoPlay
              playsInline
              className="mx-auto h-[86vh] max-h-[86vh] w-auto max-w-[96vw] rounded-xl bg-black shadow-2xl ring-1 ring-white/10"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
