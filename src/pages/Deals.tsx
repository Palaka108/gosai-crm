import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { GosaiDeal, GosaiContact, GosaiCompany, GosaiPipeline } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Handshake, Trash2, DollarSign } from "lucide-react";

const USER_ID = "47f2407b-67b9-4aa1-9a58-50bc0d461059";

export default function Deals() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filterStage, setFilterStage] = useState<string>("all");
  const [form, setForm] = useState({ title: "", value: "", stage: "New Lead", contact_id: "", company_id: "" });
  const [showNewContact, setShowNewContact] = useState(false);
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [newContact, setNewContact] = useState({ first_name: "", last_name: "", email: "" });
  const [newCompany, setNewCompany] = useState({ name: "" });

  const { data: pipeline } = useQuery({
    queryKey: ["pipeline-default"],
    queryFn: async () => {
      const { data } = await supabase.from("gosai_pipelines").select("*").eq("is_default", true).single();
      return data as GosaiPipeline | null;
    },
  });

  const stages = pipeline?.stages?.map((s) => s.name) ?? ["New Lead", "Qualified", "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"];

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals", filterStage],
    queryFn: async () => {
      let q = supabase.from("gosai_deals").select("*, gosai_contacts(id, first_name, last_name), gosai_companies(id, name)").order("created_at", { ascending: false });
      if (filterStage !== "all") q = q.eq("stage", filterStage);
      const { data } = await q;
      return (data ?? []) as GosaiDeal[];
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-list"],
    queryFn: async () => {
      const { data } = await supabase.from("gosai_contacts").select("id, first_name, last_name").order("first_name");
      return (data ?? []) as GosaiContact[];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-list"],
    queryFn: async () => {
      const { data } = await supabase.from("gosai_companies").select("id, name").order("name");
      return (data ?? []) as GosaiCompany[];
    },
  });

  const createContactMutation = useMutation({
    mutationFn: async () => {
      if (!newContact.first_name.trim()) throw new Error("First name is required");
      const { data, error } = await supabase.from("gosai_contacts").insert({
        user_id: USER_ID,
        first_name: newContact.first_name.trim(),
        last_name: newContact.last_name.trim() || null,
        email: newContact.email.trim() || null,
        status: "lead",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contacts-list"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setForm({ ...form, contact_id: data.id });
      setNewContact({ first_name: "", last_name: "", email: "" });
      setShowNewContact(false);
      toast.success("Contact created");
    },
    onError: (e) => toast.error(e.message),
  });

  const createCompanyMutation = useMutation({
    mutationFn: async () => {
      if (!newCompany.name.trim()) throw new Error("Company name is required");
      const { data, error } = await supabase.from("gosai_companies").insert({
        user_id: USER_ID,
        name: newCompany.name.trim(),
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["companies-list"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setForm({ ...form, company_id: data.id });
      setNewCompany({ name: "" });
      setShowNewCompany(false);
      toast.success("Company created");
    },
    onError: (e) => toast.error(e.message),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const stageObj = pipeline?.stages?.find((s) => s.name === form.stage);
      const { data, error } = await supabase.from("gosai_deals").insert({
        user_id: USER_ID,
        title: form.title,
        value: parseFloat(form.value) || 0,
        stage: form.stage,
        probability: stageObj?.probability ?? 10,
        pipeline_id: pipeline?.id ?? null,
        contact_id: form.contact_id || null,
        company_id: form.company_id || null,
      }).select().single();
      if (error) throw error;
      await supabase.from("gosai_activities").insert({
        user_id: USER_ID,
        type: "created",
        description: `Created deal ${form.title}`,
        linked_type: "deal",
        linked_id: data.id,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setShowModal(false);
      setForm({ title: "", value: "", stage: "New Lead", contact_id: "", company_id: "" });
      setShowNewContact(false);
      setShowNewCompany(false);
      toast.success("Deal created");
    },
    onError: (e) => toast.error(e.message),
  });

  const stageMutation = useMutation({
    mutationFn: async ({ id, newStage }: { id: string; newStage: string }) => {
      const deal = deals.find((d) => d.id === id);
      const stageObj = pipeline?.stages?.find((s) => s.name === newStage);
      const updates: Record<string, unknown> = { stage: newStage, probability: stageObj?.probability ?? 10 };
      if (newStage === "Closed Won") updates.won_at = new Date().toISOString();
      if (newStage === "Closed Lost") updates.lost_at = new Date().toISOString();
      const { error } = await supabase.from("gosai_deals").update(updates).eq("id", id);
      if (error) throw error;
      await supabase.from("gosai_activities").insert({
        user_id: USER_ID,
        type: "stage_change",
        description: `Moved deal from ${deal?.stage} to ${newStage}`,
        linked_type: "deal",
        linked_id: id,
        metadata: { old_stage: deal?.stage, new_stage: newStage },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Deal stage updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gosai_deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Deal deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const totalValue = deals.filter((d) => d.stage !== "Closed Lost").reduce((sum, d) => sum + (d.value ?? 0), 0);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deals</h1>
          <p className="text-sm text-muted-foreground mt-1">{deals.length} deal{deals.length !== 1 ? "s" : ""} — ${totalValue.toLocaleString()} total</p>
        </div>
        <Button onClick={() => setShowModal(true)}><Plus size={16} />Add Deal</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", ...stages].map((s) => (
          <button key={s} onClick={() => setFilterStage(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${filterStage === s ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>

      {deals.length === 0 ? (
        <EmptyState icon={<Handshake size={48} />} title="No deals yet" description="Create your first deal to start tracking your pipeline."
          action={<Button onClick={() => setShowModal(true)}><Plus size={16} />Add Deal</Button>} />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Deal</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Contact</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Value</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Stage</th>
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/deals/${deal.id}`} className="text-sm font-medium hover:text-primary transition-colors">{deal.title}</Link>
                    {deal.gosai_companies && <p className="text-xs text-muted-foreground mt-0.5">{deal.gosai_companies.name}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {deal.gosai_contacts ? `${deal.gosai_contacts.first_name} ${deal.gosai_contacts.last_name}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium flex items-center gap-1"><DollarSign size={12} className="text-muted-foreground" />{(deal.value ?? 0).toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3">
                    <select value={deal.stage} onChange={(e) => stageMutation.mutate({ id: deal.id, newStage: e.target.value })}
                      className="text-xs font-medium rounded-md border border-border bg-card px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/50">
                      {stages.map((s) => (<option key={s} value={s}>{s}</option>))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => { if (confirm("Delete this deal?")) deleteMutation.mutate(deal.id); }}
                      className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors cursor-pointer"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setShowNewContact(false); setShowNewCompany(false); }} title="New Deal">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
          <Input label="Deal Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. AI Automation Suite" />
          <Input label="Value ($)" type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0" />
          <Select label="Stage" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}
            options={stages.map((s) => ({ value: s, label: s }))} />

          {/* Contact — select existing or create new inline */}
          <div className="space-y-2">
            <Select label="Contact" value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })}
              options={[{ value: "", label: "No contact" }, ...contacts.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name}` }))]} />
            {!showNewContact ? (
              <button type="button" onClick={() => setShowNewContact(true)}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer">
                <Plus size={12} /> New Contact
              </button>
            ) : (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                <p className="text-xs font-medium text-primary uppercase tracking-wider">Quick-Add Contact</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="First name *" value={newContact.first_name} onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })} />
                  <Input placeholder="Last name" value={newContact.last_name} onChange={(e) => setNewContact({ ...newContact, last_name: e.target.value })} />
                </div>
                <Input placeholder="Email (optional)" type="email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} />
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={() => createContactMutation.mutate()} disabled={createContactMutation.isPending || !newContact.first_name.trim()}>
                    {createContactMutation.isPending ? "Adding..." : "Add Contact"}
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => { setShowNewContact(false); setNewContact({ first_name: "", last_name: "", email: "" }); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Company — select existing or create new inline */}
          <div className="space-y-2">
            <Select label="Company" value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}
              options={[{ value: "", label: "No company" }, ...companies.map((c) => ({ value: c.id, label: c.name }))]} />
            {!showNewCompany ? (
              <button type="button" onClick={() => setShowNewCompany(true)}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer">
                <Plus size={12} /> New Company
              </button>
            ) : (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                <p className="text-xs font-medium text-primary uppercase tracking-wider">Quick-Add Company</p>
                <Input placeholder="Company name *" value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} />
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={() => createCompanyMutation.mutate()} disabled={createCompanyMutation.isPending || !newCompany.name.trim()}>
                    {createCompanyMutation.isPending ? "Adding..." : "Add Company"}
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => { setShowNewCompany(false); setNewCompany({ name: "" }); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowModal(false); setShowNewContact(false); setShowNewCompany(false); }}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Create Deal" : "Create Deal"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
