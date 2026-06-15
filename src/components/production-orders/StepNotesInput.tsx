"use client";

import { useState, useTransition } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addStepNote } from "@/features/production-orders/actions";
import type { ProductionOrderStepNoteDto } from "@/features/production-orders/types";

export function StepNotesInput({ orderId, stepId, notes }: { orderId: string; stepId: string; notes: ProductionOrderStepNoteDto[] }) {
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <textarea
        className="min-h-20 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
        maxLength={2000}
        value={content}
        onChange={(event) => setContent(event.target.value)}
      />
      <Button
        disabled={isPending || !content.trim()}
        onClick={() =>
          startTransition(async () => {
            const result = await addStepNote(orderId, stepId, content);
            setMessage(result.success ? "Note saved. Refreshing..." : result.error);
            if (result.success) window.location.reload();
          })
        }
      >
        <MessageSquarePlus className="h-4 w-4" />
        Save Note
      </Button>
      {message ? <p className="text-sm text-secondary">{message}</p> : null}
      <div className="space-y-1">
        {notes.map((note) => (
          <p key={note.id} className="rounded-md bg-accent/35 px-3 py-2 text-sm">
            {note.content}
          </p>
        ))}
        {notes.length === 0 ? <p className="text-sm text-secondary">No notes saved yet.</p> : null}
      </div>
    </div>
  );
}
