import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { GosaiDeal, GosaiContact, GosaiCompany, GosaiPipeline, GosaiActivity } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { NotesSection } from "@/components/shared/NotesSection";
import { ArrowLeft, DollarSign, Pencil } from "lucide-react";

const USER_ID = "47f2407b-67b9-4aa1-9a58-50bc0d461059";

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({
    title: "",
    value: "",
    stage: "",
    probability: "",
    currency: "USD",
    close_date: "",
    contact_id: "",
    company_id: "",
    lost_reason: "",
  });

  const { data: deal, isLoading } = useQuery({
    queryKey: ["deal", id],
    queryFn: async () => {
      const { data } = await supabase.from("gosai_deals").select("*, gosai_contacts(id, first_name, last_name, email), gosai_companies(id, name)").eq("id", id!).single();
      return data as GosaiDeal;
    },
    enabled: !!id,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["deal-activities", id],
    queryFn: async () => {
      const { data } = await supabase.from("gosai_activities").select("*").eq("linked_type", "deal").eq("linked_id", id!).order("created_at", { ascending: false });
      return (data ?? []) as GosaiActivity[];
    },
    enabled: !!id,
  });

  const { data: pipeline } = useQuery({
    queryKey: ["pipeline-default"],
    queryFn: async () => {
      const { data } = await supabase.from("gosai_pipelines").select("*").eq("is_default", true).single();
      return data as GosaiPipeline | null;
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

  const stages = pipeline?.stages?.map((s) => s.name) ?? ["New Lead", "Qualified", "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"];

  const openEditModal = () => {
    if (!deal) return;
    setForm({
      title: deal.title,
      value: String(deal.value ?? 0),
      stage: deal.stage,
      probability: String(deal.probability ?? 10),
      currency: deal.currency || "USD",
      close_date: deal.close_date ?? "",
      contact_id: deal.contact_id ?? "",
      company_id: deal.company_id ?? "",
      lost_reason: deal.lost_reason ?? "",
    });
    setShowEdit(true);
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const updates: Record<string, unknown> = {
        title: form.title,
        value: parseFloat(form.value) || 0,
        stage: form.stage,
        probability: parseInt(form.probability) || 10,
        currency: form.currency,
        close_date: form.close_date || null,
        contact_id: form.contact_id || null,
        company_id: form.company_id || null,
        lost_reason: form.lost_reason || null,
        updated_at: new Date().toISOString(),
      };
      if (form.stage === "Closed Won" && deal?.stage !== "Closed Won") updates.won_at = new Date().toISOString();
      if (form.stage === "Closed Lost" && deal?.stage !== "Closed Lost") updates.lost_at = new Date().toISOString();

      const { error } = await supabase.from("gosai_deals").update(updates).eq("id", id!);
      if (error) throw error;

      // Log changes to activity
      const changes: string[] = [];
      if (deal?.title !== form.title) changes.push(`title to "${form.title}"`);
      if (String(deal?.value ?? 0) !== form.value) changes.push(`value to $${parseFloat(form.value).toLocaleString()}`);
      if (deal?.stage !== form.stage) changes.push(`stage from ${deal?.stage} to ${form.stage}`);
      if (String(deal?.probability) !== form.probability) changes.push(`probability to ${form.probability}%`);

      if (changes.length > 0) {
        await supabase.from("gosai_activities").insert({
          user_id: USER_ID,
          type: "updated",
          description: `Updated deal: ${changes.join(", ")}`,
          linked_type: "deal",
          linked_id: id!,
          metadata: { changes },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal", id] });
      queryClient.invalidateQueries({ queryKey: ["deal-activities", id] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setShowEdit(false);
      toast.success("Deal updated");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!deal) return <div className="text-center py-16 text-muted-foreground">Deal not found</div>;

  return (
    <div className="space-y-6">
      <Link to="/deals" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} />Back to Deals
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{deal.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="info">{deal.stage}</Badge>
            <span className="text-lg font-medium flex items-center gap-1"><DollarSign size={16} />{(deal.value ?? 0).toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">{deal.probability}% probability</span>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={openEditModal}>
          <Pencil size={14} />Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <NotesSection linkedType="deal" linkedId={id!} />

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
              <div className="flex justify-between"><span className="text-muted-foreground">Stage</span><span>{deal.stage}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Probability</span><span>{deal.probability}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><span>{deal.currency}</span></div>
              {deal.close_date && (
                <div className="flex justify-between"><span className="text-muted-foreground">Close Date</span>
                  <span>{new Date(deal.close_date).toLocaleDateString()}</span></div>
              )}
              {deal.gosai_contacts && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact</span>
                  <Link to={`/contacts/${deal.gosai_contacts.id}`} className="hover:text-primary transition-colors">
                    {deal.gosai_contacts.first_name} {deal.gosai_contacts.last_name}
                  </Link>
                </div>
              )}
              {deal.gosai_companies && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Company</span>
                  <Link to={`/companies/${deal.gosai_companies.id}`} className="hover:text-primary transition-colors">
                    {deal.gosai_companies.name}
                  </Link>
                </div>
              )}
              {deal.lost_reason && (
                <div className="flex justify-between"><span className="text-muted-foreground">Lost Reason</span><span>{deal.lost_reason}</span></div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Deal">
        <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-4">
          <Input label="Deal Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="Value ($)" type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          <Select label="Stage" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}
            options={stages.map((s) => ({ value: s, label: s }))} />
          <Input label="Probability (%)" type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} />
          <Input label="Close Date" type="date" value={form.close_date} onChange={(e) => setForm({ ...form, close_date: e.target.value })} />
          <Select label="Contact" value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })}
            options={[{ value: "", label: "No contact" }, ...contacts.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name}` }))]} />
          <Select label="Company" value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}
            options={[{ value: "", label: "No company" }, ...companies.map((c) => ({ value: c.id, label: c.name }))]} />
          <Select label="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
            options={[{ value: "USD", label: "USD" }, { value: "EUR", label: "EUR" }, { value: "GBP", label: "GBP" }, { value: "INR", label: "INR" }]} />
          {form.stage === "Closed Lost" && (
            <Input label="Lost Reason" value={form.lost_reason} onChange={(e) => setForm({ ...form, lost_reason: e.target.value })} placeholder="Why was this deal lost?" />
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
