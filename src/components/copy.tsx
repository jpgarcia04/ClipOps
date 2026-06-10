"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Botón de copiar con feedback "¡Copiado!" durante ~1.5s. */
export function CopyButton({
  value,
  label = "Copiar",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("gap-1.5", className)}
      onClick={async () => {
        if (await writeClipboard(value)) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "¡Copiado!" : label}
    </Button>
  );
}

/** Chip de hashtag: clic para copiar ese hashtag individual. */
export function CopyChip({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);

  return (
    <button
      type="button"
      title="Clic para copiar"
      onClick={async () => {
        if (await writeClipboard(value)) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }
      }}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
        copied ? "border-primary text-primary" : "border-input text-foreground"
      )}
    >
      {value}
      {copied ? (
        <Check className="h-3 w-3" />
      ) : (
        <Copy className="h-3 w-3 opacity-50" />
      )}
    </button>
  );
}
