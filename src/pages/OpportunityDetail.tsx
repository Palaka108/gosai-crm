import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { CrmOpportunity, CrmContact, CrmAccount, CrmPipeline, CrmActivity } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { NotesSection } from "@/components/shared/NotesSection";
import { ArrowLeft, DollarSign, Pencil, FileText, ClipboardList, Save } from "lucide-react";

const USER_ID = "47f2407b-67b9-4aa1-9a58-50bc0d461059";
const SALESFORCE_STAGES = ["Prospecting", "Qualification", "Proposal/Quote", "Negotiation/Review", "Closed Won", "Closed Lost"];

const DEFAULT_QUESTIONS = [
  { key: "budget", label: "Budget", placeholder: "What is their budget range?" },
  { key: "timeline", label: "Timeline", placeholder: "When do they need a solution?" },
  { key: "decision_maker", label: "Decision Maker", placeholder: "Who makes the final decision?" },
  { key: "pain_points", label: "Pain Points", placeholder: "What problems are they trying to solve?" },
  { key: "current_solution", label: "Current Solution", placeholder: "What are they using today?" },
  { key: "requirements", label: "Requirements", placeholder: "Key requirements or must-haves?" },
];

type QuestionnaireData = Record<string, string>;

export default function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [proposalNotes, setProposalNotes] = useState("");
  const [proposalDirty, setProposalDirty] = useState(false);
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData>({});
  const [questionnaireDirty, setQuestionnaireDirty] = useState(false);
  const [form, setForm] = useState({
    name: "", amount: "", stage: "", probability: "", currency: "USD",
    close_date: "", contact_id: "", account_id: "", lost_reason: "", source: "", type: "", next_step: "",
  });

  const { data: opportunity, isLoading } = useQuery({
    queryKey: ["opportunity", id],
    queryFn: async () => {
      const { data } = await supabase.from("crm_opportunities")
        .select("*, crm_contacts(id, first_name, last_name, email), crm_accounts(id, name)")
        .eq("id", id!).single();
      if (data?.proposal_notes !== undefined) setProposalNotes(data.proposal_notes ?? "");
      if (data?.custom_fields?.questionnaire) setQuestionnaire(data.custom_fields.questionnaire as QuestionnaireData);
      return data as CrmOpportunity;
    },
    enabled: !!id,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["opportunity-activities", id],
    queryFn: async () => {
      const { data } = await supabase.from("crm_activities").select("*").eq("linked_type", "opportunity").eq("linked_id", id!).order("created_at", { ascending: false });
      return (data ?? []) as CrmActivity[];
    },
    enabled: !!id,
  });

  const { data: pipeline } = useQuery({
    queryKey: ["pipeline-default"],
    queryFn: async () => {
      const { data } = await supabase.from("crm_pipelines").select("*").eq("is_default", true).single();
      return data as CrmPipeline | null;
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

  const stages = pipeline?.stages?.map((s) => s.name) ?? SALESFORCE_STAGES;

  const openEditModal = () => {
    if (!opportunity) return;
    setForm({
      name: opportunity.name,
      amount: String(opportunity.amount ?? 0),
      stage: opportunity.stage,
      probability: String(opportunity.probability ?? 10),
      currency: opportunity.currency || "USD",
      close_date: opportunity.close_date ?? "",
      contact_id: opportunity.contact_id ?? "",
      account_id: opportunity.account_id ?? "",
      lost_reason: opportunity.lost_reason ?? "",
      source: opportunity.source ?? "",
      type: opportunity.type ?? "",
      next_step: opportunity.next_step ?? "",
    });
    setShowEdit(true);
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const updates: Record<string, unknown> = {
        name: form.name,
        amount: parseFloat(form.amount) || 0,
        stage: form.stage,
        probability: parseInt(form.probability) || 10,
        currency: form.currency,
        close_date: form.close_date || null,
        contact_id: form.contact_id || null,
        primary_contact_id: form.contact_id || null,
        account_id: form.account_id || null,
        lost_reason: form.lost_reason || null,
        source: form.source || null,
        type: form.type || null,
        next_step: form.next_step || null,
        updated_at: new Date().toISOString(),
      };
      if (form.stage === "Closed Won" && opportunity?.stage !== "Closed Won") updates.won_at = new Date().toISOString();
      if (form.stage === "Closed Lost" && opportunity?.stage !== "Closed Lost") updates.lost_at = new Date().toISOString();

      const { error } = await supabase.from("crm_opportunities").update(updates).eq("id", id!);
      if (error) throw error;

      const changes: string[] = [];
      if (opportunity?.name !== form.name) changes.push(`name to "${form.name}"`);
      if (String(opportunity?.amount ?? 0) !== form.amount) changes.push(`amount to $${parseFloat(form.amount).toLocaleString()}`);
      if (opportunity?.stage !== form.stage) changes.push(`stage from ${opportunity?.stage} to ${form.stage}`);

      if (changes.length > 0) {
        await supabase.from("crm_activities").insert({
          user_id: USER_ID, type: "updated",
          description: `Updated opportunity: ${changes.join(", ")}`,
          linked_type: "opportunity", linked_id: id!,
          metadata: { changes },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunity", id] });
      queryClient.invalidateQueries({ queryKey: ["opportunity-activities", id] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      setShowEdit(false);
      toast.success("Opportunity updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const saveProposalMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("crm_opportunities").update({ proposal_notes: proposalNotes || null, updated_at: new Date().toISOString() }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunity", id] });
      setProposalDirty(false);
      toast.success("Proposal notes saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const saveQuestionnaireMutation = useMutation({
    mutationFn: async () => {
      const existingCustom = opportunity?.custom_fields ?? {};
      const { error } = await supabase.from("crm_opportunities").update({
        custom_fields: { ...existingCustom, questionnaire },
        updated_at: new Date().toISOString(),
      }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunity", id] });
      setQuestionnaireDirty(false);
      toast.success("Discovery questionnaire saved");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!opportunity) return <div className="text-center py-16 text-muted-foreground">Opportunity not found</div>;

  return (
    <div className="space-y-6">
      <Link to="/opportunities" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} />Back to Opportunities
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{opportunity.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="info">{opportunity.stage}</Badge>
            <span className="text-lg font-medium flex items-center gap-1"><DollarSign size={16} />{(opportunity.amount ?? 0).toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">{opportunity.probability}% probability</span>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={openEditModal}>
          <Pencil size={14} />Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <NotesSection linkedType="opportunity" linkedId={id!} />

          {/* Proposal Notes */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText size={16} />
                Proposal Notes
              </div>
              {proposalDirty && (
                <Button size="sm" onClick={() => saveProposalMutation.mutate()} disabled={saveProposalMutation.isPending}>
                  {saveProposalMutation.isPending ? "Saving..." : "Save"}
                </Button>
              )}
            </div>
            <textarea
              value={proposalNotes}
              onChange={(e) => { setProposalNotes(e.target.value); setProposalDirty(true); }}
              onBlur={() => { if (proposalDirty) saveProposalMutation.mutate(); }}
              placeholder="Add proposal details, scope, pricing notes..."
              rows={6}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
            />
          </Card>

          {/* Discovery Questionnaire */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <ClipboardList size={16} />
                Discovery Questionnaire
              </div>
              {questionnaireDirty && (
                <Button size="sm" onClick={() => saveQuestionnaireMutation.mutate()} disabled={saveQuestionnaireMutation.isPending}>
                  <Save size={12} />
                  {saveQuestionnaireMutation.isPending ? "Saving..." : "Save"}
                </Button>
              )}
            </div>
            <div className="space-y-4">
              {DEFAULT_QUESTIONS.map((q) => (
                <div key={q.key}>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    {q.label}
                  </label>
                  <textarea
                    value={questionnaire[q.key] ?? ""}
                    onChange={(e) => {
                      setQuestionnaire((prev) => ({ ...prev, [q.key]: e.target.value }));
                      setQuestionnaireDirty(true);
                    }}
                    onBlur={() => { if (questionnaireDirty) saveQuestionnaireMutation.mutate(); }}
                    placeholder={q.placeholder}
                    rows={2}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Activity</h3>
            <div className="space-y-3">
              {activities.map((a) => (
                <div key={a.id} className="flex gap-3 py-1.5 border-b border-border/50 last:border-0">
                  <div className="flex-1">
                    <p className="text-sm">{a.description || a.type}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
              {activities.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Stage</span><span>{opportunity.stage}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Probability</span><span>{opportunity.probability}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><span>{opportunity.currency}</span></div>
              {opportunity.type && <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{opportunity.type}</span></div>}
              {opportunity.source && <div className="flex justify-between"><span className="text-muted-foreground">Source</span><span>{opportunity.source}</span></div>}
              {opportunity.next_step && <div className="flex justify-between"><span className="text-muted-foreground">Next Step</span><span>{opportunity.next_step}</span></div>}
              {opportunity.close_date && (
                <div className="flex justify-between"><span className="text-muted-foreground">Close Date</span>
                  <span>{new Date(opportunity.close_date).toLocaleDateString()}</span></div>
              )}
              {opportunity.crm_contacts && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact</span>
                  <Link to={`/contacts/${opportunity.crm_contacts.id}`} className="hover:text-primary transition-colors">
                    {opportunity.crm_contacts.first_name} {opportunity.crm_contacts.last_name}
                  </Link>
                </div>
              )}
              {opportunity.crm_accounts && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account</span>
                  <Link to={`/accounts/${opportunity.crm_accounts.id}`} className="hover:text-primary transition-colors">
                    {opportunity.crm_accounts.name}
                  </Link>
                </div>
              )}
              {opportunity.lost_reason && (
                <div className="flex justify-between"><span className="text-muted-foreground">Lost Reason</span><span>{opportunity.lost_reason}</span></div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Opportunity">
        <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-4">
          <Input label="Opportunity Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Amount ($)" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Select label="Stage" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}
            options={stages.map((s) => ({ value: s, label: s }))} />
          <Input label="Probability (%)" type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} />
          <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            options={[{ value: "", label: "Select type" }, { value: "New Business", label: "New Business" }, { value: "Expansion", label: "Expansion" }, { value: "Renewal", label: "Renewal" }]} />
          <Input label="Next Step" value={form.next_step} onChange={(e) => setForm({ ...form, next_step: e.target.value })} placeholder="e.g. Send proposal" />
          <Input label="Close Date" type="date" value={form.close_date} onChange={(e) => setForm({ ...form, close_date: e.target.value })} />
          <Select label="Contact" value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })}
            options={[{ value: "", label: "No contact" }, ...contacts.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name}` }))]} />
          <Select label="Account" value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}
            options={[{ value: "", label: "No account" }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]} />
          <Select label="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
            options={[{ value: "USD", label: "USD" }, { value: "EUR", label: "EUR" }, { value: "GBP", label: "GBP" }, { value: "INR", label: "INR" }]} />
          {form.stage === "Closed Lost" && (
            <Input label="Lost Reason" value={form.lost_reason} onChange={(e) => setForm({ ...form, lost_reason: e.target.value })} placeholder="Why was this lost?" />
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : "Save Changes"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
