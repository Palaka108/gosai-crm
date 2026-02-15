import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { CrmOpportunity, CrmContact, CrmAccount, CrmPipeline } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Target, Trash2, DollarSign } from "lucide-react";

const USER_ID = "47f2407b-67b9-4aa1-9a58-50bc0d461059";

const SALESFORCE_STAGES = ["Prospecting", "Qualification", "Proposal/Quote", "Negotiation/Review", "Closed Won", "Closed Lost"];

export default function Opportunities() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filterStage, setFilterStage] = useState<string>("all");
  const [form, setForm] = useState({ name: "", amount: "", stage: "Prospecting", contact_id: "", account_id: "", source: "", type: "New Business" });
  const [showNewContact, setShowNewContact] = useState(false);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newContact, setNewContact] = useState({ first_name: "", last_name: "", email: "" });
  const [newAccount, setNewAccount] = useState({ name: "" });

  const { data: pipeline } = useQuery({
    queryKey: ["pipeline-default"],
    queryFn: async () => {
      const { data } = await supabase.from("crm_pipelines").select("*").eq("is_default", true).single();
      return data as CrmPipeline | null;
    },
  });

  const stages = pipeline?.stages?.map((s) => s.name) ?? SALESFORCE_STAGES;

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ["opportunities", filterStage],
    queryFn: async () => {
      let q = supabase.from("crm_opportunities").select("*, crm_contacts(id, first_name, last_name), crm_accounts(id, name)").order("created_at", { ascending: false });
      if (filterStage !== "all") q = q.eq("stage", filterStage);
      const { data } = await q;
      return (data ?? []) as CrmOpportunity[];
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-list"],
    queryFn: async () => {
      const { data } = await supabase.from("crm_contacts").select("id, first_name, last_name").order("first_name");
      return (data ?? []) as CrmContact[];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts-list"],
    queryFn: async () => {
      const { data } = await supabase.from("crm_accounts").select("id, name").order("name");
      return (data ?? []) as CrmAccount[];
    },
  });

  const createContactMutation = useMutation({
    mutationFn: async () => {
      if (!newContact.first_name.trim()) throw new Error("First name is required");
      const { data, error } = await supabase.from("crm_contacts").insert({
        user_id: USER_ID, first_name: newContact.first_name.trim(),
        last_name: newContact.last_name.trim() || null, email: newContact.email.trim() || null, status: "prospect",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contacts-list"] });
      setForm({ ...form, contact_id: data.id });
      setNewContact({ first_name: "", last_name: "", email: "" });
      setShowNewContact(false);
      toast.success("Contact created");
    },
    onError: (e) => toast.error(e.message),
  });

  const createAccountMutation = useMutation({
    mutationFn: async () => {
      if (!newAccount.name.trim()) throw new Error("Account name is required");
      const { data, error } = await supabase.from("crm_accounts").insert({
        user_id: USER_ID, name: newAccount.name.trim(), type: "Prospect", stage: "Prospecting",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["accounts-list"] });
      setForm({ ...form, account_id: data.id });
      setNewAccount({ name: "" });
      setShowNewAccount(false);
      toast.success("Account created");
    },
    onError: (e) => toast.error(e.message),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const stageObj = pipeline?.stages?.find((s) => s.name === form.stage);
      const { data, error } = await supabase.from("crm_opportunities").insert({
        user_id: USER_ID,
        name: form.name,
        amount: parseFloat(form.amount) || 0,
        stage: form.stage,
        probability: stageObj?.probability ?? 10,
        pipeline_id: pipeline?.id ?? null,
        contact_id: form.contact_id || null,
        primary_contact_id: form.contact_id || null,
        account_id: form.account_id || null,
        source: form.source || null,
        type: form.type || null,
      }).select().single();
      if (error) throw error;
      await supabase.from("crm_activities").insert({
        user_id: USER_ID, type: "created",
        description: `Created opportunity ${form.name}`,
        linked_type: "opportunity", linked_id: data.id,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      setShowModal(false);
      setForm({ name: "", amount: "", stage: "Prospecting", contact_id: "", account_id: "", source: "", type: "New Business" });
      setShowNewContact(false);
      setShowNewAccount(false);
      toast.success("Opportunity created");
    },
    onError: (e) => toast.error(e.message),
  });

  const stageMutation = useMutation({
    mutationFn: async ({ id, newStage }: { id: string; newStage: string }) => {
      const opp = opportunities.find((o) => o.id === id);
      const stageObj = pipeline?.stages?.find((s) => s.name === newStage);
      const updates: Record<string, unknown> = { stage: newStage, probability: stageObj?.probability ?? 10 };
      if (newStage === "Closed Won") updates.won_at = new Date().toISOString();
      if (newStage === "Closed Lost") updates.lost_at = new Date().toISOString();
      const { error } = await supabase.from("crm_opportunities").update(updates).eq("id", id);
      if (error) throw error;
      await supabase.from("crm_activities").insert({
        user_id: USER_ID, type: "stage_change",
        description: `Moved opportunity from ${opp?.stage} to ${newStage}`,
        linked_type: "opportunity", linked_id: id,
        metadata: { old_stage: opp?.stage, new_stage: newStage },
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["opportunities"] }); toast.success("Stage updated"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_opportunities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["opportunities"] }); toast.success("Opportunity deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const totalValue = opportunities.filter((o) => o.stage !== "Closed Lost").reduce((sum, o) => sum + (o.amount ?? 0), 0);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Opportunities</h1>
          <p className="text-sm text-muted-foreground mt-1">{opportunities.length} opportunit{opportunities.length !== 1 ? "ies" : "y"} — ${totalValue.toLocaleString()} pipeline</p>
        </div>
        <Button onClick={() => setShowModal(true)}><Plus size={16} />Add Opportunity</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", ...stages].map((s) => (
          <button key={s} onClick={() => setFilterStage(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${filterStage === s ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>

      {opportunities.length === 0 ? (
        <EmptyState icon={<Target size={48} />} title="No opportunities yet" description="Create your first opportunity to start tracking your pipeline."
          action={<Button onClick={() => setShowModal(true)}><Plus size={16} />Add Opportunity</Button>} />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Opportunity</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Contact</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Amount</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Stage</th>
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opp) => (
                <tr key={opp.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/opportunities/${opp.id}`} className="text-sm font-medium hover:text-primary transition-colors">{opp.name}</Link>
                    {opp.crm_accounts && <p className="text-xs text-muted-foreground mt-0.5">{opp.crm_accounts.name}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {opp.crm_contacts ? `${opp.crm_contacts.first_name} ${opp.crm_contacts.last_name}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium flex items-center gap-1"><DollarSign size={12} className="text-muted-foreground" />{(opp.amount ?? 0).toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3">
                    <select value={opp.stage} onChange={(e) => stageMutation.mutate({ id: opp.id, newStage: e.target.value })}
                      className="text-xs font-medium rounded-md border border-border bg-card px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/50">
                      {stages.map((s) => (<option key={s} value={s}>{s}</option>))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => { if (confirm("Delete this opportunity?")) deleteMutation.mutate(opp.id); }}
                      className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors cursor-pointer"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setShowNewContact(false); setShowNewAccount(false); }} title="New Opportunity">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
          <Input label="Opportunity Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. AI Automation Suite" />
          <Input label="Amount ($)" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
          <Select label="Stage" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}
            options={stages.map((s) => ({ value: s, label: s }))} />
          <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            options={[{ value: "New Business", label: "New Business" }, { value: "Expansion", label: "Expansion" }, { value: "Renewal", label: "Renewal" }]} />
          <Select label="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
            options={[{ value: "", label: "Select source" }, { value: "Apollo", label: "Apollo" }, { value: "referral", label: "Referral" }, { value: "inbound", label: "Inbound" }, { value: "cold", label: "Cold Outreach" }, { value: "event", label: "Event" }]} />

          <div className="space-y-2">
            <Select label="Contact" value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })}
              options={[{ value: "", label: "No contact" }, ...contacts.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name}` }))]} />
            {!showNewContact ? (
              <button type="button" onClick={() => setShowNewContact(true)} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer"><Plus size={12} /> New Contact</button>
            ) : (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                <p className="text-xs font-medium text-primary uppercase tracking-wider">Quick-Add Contact</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="First name *" value={newContact.first_name} onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })} />
                  <Input placeholder="Last name" value={newContact.last_name} onChange={(e) => setNewContact({ ...newContact, last_name: e.target.value })} />
                </div>
                <Input placeholder="Email" type="email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} />
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={() => createContactMutation.mutate()} disabled={createContactMutation.isPending || !newContact.first_name.trim()}>
                    {createContactMutation.isPending ? "Adding..." : "Add Contact"}
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => { setShowNewContact(false); setNewContact({ first_name: "", last_name: "", email: "" }); }}>Cancel</Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Select label="Account" value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}
              options={[{ value: "", label: "No account" }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]} />
            {!showNewAccount ? (
              <button type="button" onClick={() => setShowNewAccount(true)} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer"><Plus size={12} /> New Account</button>
            ) : (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                <p className="text-xs font-medium text-primary uppercase tracking-wider">Quick-Add Account</p>
                <Input placeholder="Account name *" value={newAccount.name} onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} />
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={() => createAccountMutation.mutate()} disabled={createAccountMutation.isPending || !newAccount.name.trim()}>
                    {createAccountMutation.isPending ? "Adding..." : "Add Account"}
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => { setShowNewAccount(false); setNewAccount({ name: "" }); }}>Cancel</Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowModal(false); setShowNewContact(false); setShowNewAccount(false); }}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Opportunity"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
