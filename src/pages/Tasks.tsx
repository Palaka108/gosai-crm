import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { GosaiTask, TaskPriority, TaskStatus } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { CheckSquare, Plus, Trash2, Check } from "lucide-react";

const USER_ID = "47f2407b-67b9-4aa1-9a58-50bc0d461059";

const PRIORITY_BADGE: Record<TaskPriority, "default" | "warning" | "destructive" | "info"> = {
  low: "default", medium: "info", high: "warning", urgent: "destructive",
};

export default function Tasks() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [newTitle, setNewTitle] = useState("");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", filterStatus],
    queryFn: async () => {
      let q = supabase.from("gosai_tasks").select("*").order("due_date", { ascending: true, nullsFirst: false });
      if (filterStatus === "active") q = q.in("status", ["pending", "in_progress"]);
      else if (filterStatus !== "all") q = q.eq("status", filterStatus);
      const { data } = await q;
      return (data ?? []) as GosaiTask[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("gosai_tasks").insert({
        user_id: USER_ID,
        title: newTitle,
        priority: "medium",
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setNewTitle("");
      toast.success("Task created");
    },
    onError: (e) => toast.error(e.message),
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gosai_tasks").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Task completed"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gosai_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Task deleted"); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {[{ key: "active", label: "Active" }, { key: "completed", label: "Completed" }, { key: "all", label: "All" }].map(({ key, label }) => (
          <button key={key} onClick={() => setFilterStatus(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${filterStatus === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Quick add */}
      <div className="flex gap-2">
        <Input placeholder="Add a task..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && newTitle.trim()) createMutation.mutate(); }}
          className="flex-1" />
        <Button onClick={() => { if (newTitle.trim()) createMutation.mutate(); }} disabled={!newTitle.trim() || createMutation.isPending}>
          <Plus size={16} />Add
        </Button>
      </div>

      {tasks.length === 0 ? (
        <EmptyState icon={<CheckSquare size={48} />} title="No tasks" description="Add your first task above." />
      ) : (
        <div className="space-y-1">
          {tasks.map((task) => (
            <div key={task.id} className="group flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted/20 transition-colors">
              <button onClick={() => { if (task.status !== "completed") completeMutation.mutate(task.id); }}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors cursor-pointer ${
                  task.status === "completed" ? "bg-success border-success" : "border-border hover:border-primary"}`}>
                {task.status === "completed" && <Check size={12} className="text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                {task.due_date && (
                  <p className={`text-xs mt-0.5 ${new Date(task.due_date) < new Date() && task.status !== "completed" ? "text-destructive" : "text-muted-foreground"}`}>
                    Due {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                )}
              </div>
              <Badge variant={PRIORITY_BADGE[task.priority]} className="text-[10px]">{task.priority}</Badge>
              <button onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(task.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition-all cursor-pointer"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
