import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { CrmLead, LeadStatus } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, UserPlus, Trash2 } from "lucide-react";

const STATUS_BADGE: Record<LeadStatus, "info" | "warning" | "success" | "default" | "destructive"> = {
  New: "info", Working: "warning", Nurturing: "default", Qualified: "success", Disqualified: "destructive",
};

const USER_ID = "47f2407b-67b9-4aa1-9a58-50bc0d461059";

export default function Leads() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [form, setForm] = useState({
    first_name: "", last_name: "", company_name: "", email: "", phone: "", title: "",
    source: "", status: "New" as LeadStatus, industry: "", company_size: "", region: "", linkedin_url: "",
  });

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", filterStatus],
    queryFn: async () => {
      let q = supabase.from("crm_leads").select("*").order("created_at", { ascending: false });
      if (filterStatus !== "all") q = q.eq("status", filterStatus);
      const { data } = await q;
      return (data ?? []) as CrmLead[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("crm_leads").insert({
        user_id: USER_ID,
        first_name: form.first_name,
        last_name: form.last_name || null,
        company_name: form.company_name || null,
        email: form.email || null,
        phone: form.phone || null,
        title: form.title || null,
        source: form.source || null,
        status: form.status,
        industry: form.industry || null,
        company_size: form.company_size || null,
        region: form.region || null,
        linkedin_url: form.linkedin_url || null,
      }).select().single();
      if (error) throw error;
      await supabase.from("crm_activities").insert({
        user_id: USER_ID,
        type: "created",
        description: `Created lead ${form.first_name} ${form.last_name}`,
        linked_type: "lead",
        linked_id: data.id,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setShowModal(false);
      setForm({ first_name: "", last_name: "", company_name: "", email: "", phone: "", title: "", source: "", status: "New", industry: "", company_size: "", region: "", linkedin_url: "" });
      toast.success("Lead created");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">{leads.length} lead{leads.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowModal(true)}><Plus size={16} />Add Lead</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "New", "Working", "Nurturing", "Qualified", "Disqualified"].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${filterStatus === s ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>

      {leads.length === 0 ? (
        <EmptyState icon={<UserPlus size={48} />} title="No leads yet" description="Add leads manually or import from Apollo CSV."
          action={<Button onClick={() => setShowModal(true)}><Plus size={16} />Add Lead</Button>} />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Company</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Email</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Source</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/leads/${lead.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                      {lead.first_name} {lead.last_name}
                    </Link>
                    {lead.title && <p className="text-xs text-muted-foreground">{lead.title}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{lead.company_name || "—"}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{lead.email || "—"}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{lead.source || "—"}</td>
                  <td className="px-4 py-3"><Badge variant={STATUS_BADGE[lead.status]}>{lead.status}</Badge></td>
                  <td className="px-4 py-3">
                    <button onClick={() => { if (confirm("Delete this lead?")) deleteMutation.mutate(lead.id); }}
                      className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors cursor-pointer"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Lead">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            <Input label="Last Name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
          <Input label="Company" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Job Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="LinkedIn URL" value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." />
          <Select label="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
            options={[{ value: "", label: "Select source" }, { value: "Apollo", label: "Apollo" }, { value: "referral", label: "Referral" }, { value: "website", label: "Website" }, { value: "cold", label: "Cold Outreach" }, { value: "event", label: "Event" }, { value: "linkedin", label: "LinkedIn" }]} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}
            options={[{ value: "New", label: "New" }, { value: "Working", label: "Working" }, { value: "Nurturing", label: "Nurturing" }, { value: "Qualified", label: "Qualified" }]} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Lead"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
