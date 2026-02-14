import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { GosaiProject, ProjectStatus } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, FolderKanban, Trash2 } from "lucide-react";

const USER_ID = "47f2407b-67b9-4aa1-9a58-50bc0d461059";

const STATUS_BADGE: Record<ProjectStatus, "default" | "success" | "warning" | "info" | "destructive"> = {
  planning: "default", active: "success", on_hold: "warning", completed: "info", cancelled: "destructive",
};

export default function Projects() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", status: "planning" as ProjectStatus, start_date: "", end_date: "", budget: "" });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data } = await supabase.from("gosai_projects").select("*").order("created_at", { ascending: false });
      return (data ?? []) as GosaiProject[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("gosai_projects").insert({
        user_id: USER_ID,
        name: form.name,
        description: form.description || null,
        status: form.status,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        budget: form.budget ? parseFloat(form.budget) : null,
      }).select().single();
      if (error) throw error;
      await supabase.from("gosai_activities").insert({
        user_id: USER_ID, type: "created", description: `Created project ${form.name}`, linked_type: "project", linked_id: data.id,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowModal(false);
      setForm({ name: "", description: "", status: "planning", start_date: "", end_date: "", budget: "" });
      toast.success("Project created");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gosai_projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); toast.success("Project deleted"); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-slide-down">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowModal(true)}><Plus size={16} />Add Project</Button>
      </div>

      {projects.length === 0 ? (
        <EmptyState icon={<FolderKanban size={48} />} title="No projects yet" description="Create your first project to track client work."
          action={<Button onClick={() => setShowModal(true)}><Plus size={16} />Add Project</Button>} />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-border bg-muted/30">
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Name</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Budget</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Dates</th>
              <th className="w-20 px-4 py-3" />
            </tr></thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-b border-border/50 row-glow transition-all duration-200">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{p.name}</p>
                    {p.description && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{p.description}</p>}
                  </td>
                  <td className="px-4 py-3"><Badge variant={STATUS_BADGE[p.status]}>{p.status}</Badge></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{p.budget ? `$${p.budget.toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {p.start_date ? new Date(p.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                    {p.end_date ? ` — ${new Date(p.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => { if (confirm("Delete this project?")) deleteMutation.mutate(p.id); }}
                      className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors cursor-pointer"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Project">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
          <Input label="Project Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
            options={[{ value: "planning", label: "Planning" }, { value: "active", label: "Active" }, { value: "on_hold", label: "On Hold" }]} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <Input label="End Date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
          <Input label="Budget ($)" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Project"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
