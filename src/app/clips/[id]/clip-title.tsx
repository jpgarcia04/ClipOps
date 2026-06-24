"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

export function ClipTitle({
  clipId,
  initialTitle,
}: {
  clipId: string;
  initialTitle: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(initialTitle);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  const save = async () => {
    const t = title.trim();
    setEditing(false);
    if (!t || t === initialTitle) {
      setTitle(initialTitle);
      return;
    }
    setSaving(true);
    try {
      await fetch(`/api/clips/${clipId}/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t }),
      });
      router.refresh();
    } catch {
      setTitle(initialTitle);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={title}
        disabled={saving}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") {
            setTitle(initialTitle);
            setEditing(false);
          }
        }}
        className="w-full max-w-md rounded-md border border-input bg-background px-2 py-1 text-xl font-semibold tracking-tight outline-none focus:ring-2 focus:ring-ring"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Clic para renombrar (solo en la app, Drive no se toca)"
      className="group inline-flex items-center gap-1.5 text-left text-xl font-semibold tracking-tight"
    >
      {title}
      <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}
