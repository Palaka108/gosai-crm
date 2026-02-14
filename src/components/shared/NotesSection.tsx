import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { GosaiNote, EntityType } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MessageSquare, Trash2, Send, Pin } from "lucide-react";

const USER_ID = "47f2407b-67b9-4aa1-9a58-50bc0d461059";

interface NotesSectionProps {
  linkedType: EntityType;
  linkedId: string;
}

export function NotesSection({ linkedType, linkedId }: NotesSectionProps) {
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState("");

  const { data: notes = [] } = useQuery({
    queryKey: ["notes", linkedType, linkedId],
    queryFn: async () => {
      const { data } = await supabase
        .from("gosai_notes")
        .select("*")
        .eq("linked_type", linkedType)
        .eq("linked_id", linkedId)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      return (data ?? []) as GosaiNote[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("gosai_notes").insert({
        user_id: USER_ID,
        content: newNote.trim(),
        linked_type: linkedType,
        linked_id: linkedId,
        author: "GOSAI CRM",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", linkedType, linkedId] });
      setNewNote("");
      toast.success("Note added");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gosai_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", linkedType, linkedId] });
      toast.success("Note deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
        <MessageSquare size={16} />
        Notes ({notes.length})
      </div>

      <div className="flex gap-2 mb-4">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
          rows={2}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && newNote.trim()) createMutation.mutate();
          }}
        />
        <Button onClick={() => { if (newNote.trim()) createMutation.mutate(); }} disabled={!newNote.trim() || createMutation.isPending} size="sm" className="self-end">
          <Send size={14} />
        </Button>
      </div>

      <div className="space-y-2">
        {notes.map((note) => (
          <div key={note.id} className="group flex gap-3 rounded-lg border border-border bg-card/50 p-3">
            <div className="flex-1">
              {note.pinned && <Pin size={12} className="text-primary inline mr-1" />}
              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              <p className="text-xs text-muted-foreground mt-1.5">
                {note.author && `${note.author} · `}
                {new Date(note.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
            <button onClick={() => deleteMutation.mutate(note.id)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition-all cursor-pointer">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
