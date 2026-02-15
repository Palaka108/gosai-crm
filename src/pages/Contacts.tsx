import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { GosaiContact, GosaiCompany, ContactStatus } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Users, Trash2, ExternalLink } from "lucide-react";

const STATUS_BADGE: Record<ContactStatus, "info" | "warning" | "success" | "default" | "destructive"> = {
  lead: "info", prospect: "warning", client: "success", inactive: "default", churned: "destructive",
};

const USER_ID = "47f2407b-67b9-4aa1-9a58-50bc0d461059";

export default function Contacts() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", company_id: "", status: "lead" as ContactStatus, title: "", source: "" });

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts", filterStatus],
    queryFn: async () => {
      let q = supabase.from("gosai_contacts").select("*, gosai_companies(id, name)").order("created_at", { ascending: false });
      if (filterStatus !== "all") q = q.eq("status", filterStatus);
      const { data } = await q;
      return (data ?? []) as GosaiContact[];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data } = await supabase.from("gosai_companies").select("*").order("name");
      return (data ?? []) as GosaiCompany[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("gosai_contacts").insert({
        user_id: USER_ID,
        first_name: form.first_name,
        last_name: form.last_name || null,
        email: form.email || null,
        phone: form.phone || null,
        company_id: form.company_id || null,
        status: form.status,
        title: form.title || null,
        source: form.source || null,
      }).select().single();
      if (error) throw error;
      // Log activity
      await supabase.from("gosai_activities").insert({
        user_id: USER_ID,
        type: "created",
        description: `Created contact ${form.first_name} ${form.last_name}`,
        linked_type: "contact",
        linked_id: data.id,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setShowModal(false);
      setForm({ first_name: "", last_name: "", email: "", phone: "", company_id: "", status: "lead", title: "", source: "" });
      toast.success("Contact created");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gosai_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact deleted");
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
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">{contacts.length} contact{contacts.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowModal(true)}><Plus size={16} />Add Contact</Button>
      </div>

      <div className="flex gap-2">
        {["all", "lead", "prospect", "client", "inactive", "churned"].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${filterStatus === s ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {contacts.length === 0 ? (
        <EmptyState icon={<Users size={48} />} title="No contacts yet" description="Add your first contact to start building your pipeline."
          action={<Button onClick={() => setShowModal(true)}><Plus size={16} />Add Contact</Button>} />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Email</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Company</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/contacts/${c.id}`} className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1.5">
                      {c.first_name} {c.last_name} <ExternalLink size={12} className="opacity-0 group-hover:opacity-100" />
                    </Link>
                    {c.title && <p className="text-xs text-muted-foreground">{c.title}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{c.gosai_companies?.name || "—"}</td>
                  <td className="px-4 py-3"><Badge variant={STATUS_BADGE[c.status]}>{c.status}</Badge></td>
                  <td className="px-4 py-3">
                    <button onClick={() => { if (confirm("Delete this contact?")) deleteMutation.mutate(c.id); }}
                      className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors cursor-pointer"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Contact">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            <Input label="Last Name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Job Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Select label="Company" value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}
            options={[{ value: "", label: "No company" }, ...companies.map((c) => ({ value: c.id, label: c.name }))]} />
          <Select label="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
            options={[{ value: "", label: "Select source" }, { value: "referral", label: "Referral" }, { value: "website", label: "Website" }, { value: "cold", label: "Cold Outreach" }, { value: "event", label: "Event" }, { value: "linkedin", label: "LinkedIn" }]} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ContactStatus })}
            options={[{ value: "lead", label: "Lead" }, { value: "prospect", label: "Prospect" }, { value: "client", label: "Client" }]} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Contact"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
