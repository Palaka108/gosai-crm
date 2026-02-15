import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { CrmLead, LeadStatus } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { NotesSection } from "@/components/shared/NotesSection";
import { ArrowLeft, Mail, Phone, Building2, Pencil, ArrowRightCircle, Linkedin, MapPin, Briefcase } from "lucide-react";

const USER_ID = "47f2407b-67b9-4aa1-9a58-50bc0d461059";

const STATUS_BADGE: Record<LeadStatus, "info" | "warning" | "success" | "default" | "destructive"> = {
  New: "info", Working: "warning", Nurturing: "default", Qualified: "success", Disqualified: "destructive",
};

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [convertCreateOpp, setConvertCreateOpp] = useState(true);
  const [form, setForm] = useState({
    first_name: "", last_name: "", company_name: "", email: "", phone: "", title: "",
    source: "", status: "New" as LeadStatus, industry: "", company_size: "", region: "", linkedin_url: "", notes: "",
  });

  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      const { data } = await supabase.from("crm_leads").select("*").eq("id", id!).single();
      return data as CrmLead;
    },
    enabled: !!id,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["lead-activities", id],
    queryFn: async () => {
      const { data } = await supabase.from("crm_activities").select("*").eq("linked_type", "lead").eq("linked_id", id!).order("created_at", { ascending: false });
      return (data ?? []) as { id: string; type: string; description: string | null; created_at: string }[];
    },
    enabled: !!id,
  });

  const openEditModal = () => {
    if (!lead) return;
    setForm({
      first_name: lead.first_name,
      last_name: lead.last_name ?? "",
      company_name: lead.company_name ?? "",
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      title: lead.title ?? "",
      source: lead.source ?? "",
      status: lead.status,
      industry: lead.industry ?? "",
      company_size: lead.company_size ?? "",
      region: lead.region ?? "",
      linkedin_url: lead.linkedin_url ?? "",
      notes: lead.notes ?? "",
    });
    setShowEdit(true);
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const updates = {
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
        notes: form.notes || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("crm_leads").update(updates).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", id] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setShowEdit(false);
      toast.success("Lead updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const convertMutation = useMutation({
    mutationFn: async () => {
      if (!lead) throw new Error("No lead");

      // 1. Create Account
      const { data: account, error: accErr } = await supabase.from("crm_accounts").insert({
        user_id: USER_ID,
        name: lead.company_name || `${lead.first_name} ${lead.last_name}`,
        industry: lead.industry || null,
        size: lead.company_size || null,
        region: lead.region || null,
        type: "Prospect",
        stage: "Prospecting",
      }).select().single();
      if (accErr) throw accErr;

      // 2. Create Contact
      const { data: contact, error: conErr } = await supabase.from("crm_contacts").insert({
        user_id: USER_ID,
        first_name: lead.first_name,
        last_name: lead.last_name || null,
        email: lead.email || null,
        phone: lead.phone || null,
        title: lead.title || null,
        source: lead.source || null,
        linkedin_url: lead.linkedin_url || null,
        account_id: account.id,
        status: "prospect",
      }).select().single();
      if (conErr) throw conErr;

      // 3. Optionally create Opportunity
      let oppId: string | null = null;
      if (convertCreateOpp) {
        const { data: opp, error: oppErr } = await supabase.from("crm_opportunities").insert({
          user_id: USER_ID,
          name: `Opportunity - ${account.name}`,
          account_id: account.id,
          contact_id: contact.id,
          primary_contact_id: contact.id,
          stage: "Prospecting",
          probability: 10,
          source: lead.source || null,
          type: "New Business",
        }).select().single();
        if (oppErr) throw oppErr;
        oppId = opp.id;
      }

      // 4. Update lead as converted
      const { error: upErr } = await supabase.from("crm_leads").update({
        status: "Qualified",
        converted_account_id: account.id,
        converted_contact_id: contact.id,
        converted_opportunity_id: oppId,
        converted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", id!);
      if (upErr) throw upErr;

      // 5. Log activity
      await supabase.from("crm_activities").insert({
        user_id: USER_ID,
        type: "converted",
        description: `Converted lead to Account "${account.name}", Contact "${lead.first_name} ${lead.last_name}"${convertCreateOpp ? ", and Opportunity" : ""}`,
        linked_type: "lead",
        linked_id: id!,
      });

      return { accountId: account.id, contactId: contact.id, oppId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setShowConvert(false);
      toast.success("Lead converted successfully!");
      navigate(`/accounts/${data.accountId}`);
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!lead) return <div className="text-center py-16 text-muted-foreground">Lead not found</div>;

  const isConverted = !!lead.converted_at;

  return (
    <div className="space-y-6">
      <Link to="/leads" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} />Back to Leads
      </Link>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-xl font-medium text-primary">
            {lead.first_name.charAt(0)}{lead.last_name?.charAt(0) || ""}
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{lead.first_name} {lead.last_name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {lead.title && <span className="text-sm text-muted-foreground">{lead.title}</span>}
              <Badge variant={STATUS_BADGE[lead.status]}>{lead.status}</Badge>
              {isConverted && <Badge variant="success">Converted</Badge>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!isConverted && (
            <Button onClick={() => setShowConvert(true)}>
              <ArrowRightCircle size={14} />Convert Lead
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={openEditModal}>
            <Pencil size={14} />Edit
          </Button>
        </div>
      </div>

      {isConverted && lead.converted_account_id && (
        <div className="rounded-lg border border-success/30 bg-success/5 p-4">
          <p className="text-sm text-success font-medium mb-2">This lead has been converted</p>
          <div className="flex gap-4 text-sm">
            <Link to={`/accounts/${lead.converted_account_id}`} className="text-primary hover:underline">View Account</Link>
            {lead.converted_contact_id && <Link to={`/contacts/${lead.converted_contact_id}`} className="text-primary hover:underline">View Contact</Link>}
            {lead.converted_opportunity_id && <Link to={`/opportunities/${lead.converted_opportunity_id}`} className="text-primary hover:underline">View Opportunity</Link>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <NotesSection linkedType="lead" linkedId={id!} />

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
            <div className="space-y-3">
              {lead.email && <div className="flex items-center gap-2 text-sm"><Mail size={14} className="text-muted-foreground" />{lead.email}</div>}
              {lead.phone && <div className="flex items-center gap-2 text-sm"><Phone size={14} className="text-muted-foreground" />{lead.phone}</div>}
              {lead.company_name && <div className="flex items-center gap-2 text-sm"><Building2 size={14} className="text-muted-foreground" />{lead.company_name}</div>}
              {lead.industry && <div className="flex items-center gap-2 text-sm"><Briefcase size={14} className="text-muted-foreground" />{lead.industry}</div>}
              {lead.region && <div className="flex items-center gap-2 text-sm"><MapPin size={14} className="text-muted-foreground" />{lead.region}</div>}
              {lead.linkedin_url && (
                <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Linkedin size={14} />LinkedIn
                </a>
              )}
              {lead.source && <div className="text-sm text-muted-foreground">Source: {lead.source}</div>}
              {lead.company_size && <div className="text-sm text-muted-foreground">Company Size: {lead.company_size}</div>}
            </div>
          </Card>

          {lead.notes && (
            <Card>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Lead Notes</h3>
              <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Lead">
        <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            <Input label="Last Name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
          <Input label="Company" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Job Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="LinkedIn URL" value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} />
          <Select label="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
            options={[{ value: "", label: "Select source" }, { value: "Apollo", label: "Apollo" }, { value: "referral", label: "Referral" }, { value: "website", label: "Website" }, { value: "cold", label: "Cold Outreach" }, { value: "event", label: "Event" }, { value: "linkedin", label: "LinkedIn" }]} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}
            options={[{ value: "New", label: "New" }, { value: "Working", label: "Working" }, { value: "Nurturing", label: "Nurturing" }, { value: "Qualified", label: "Qualified" }, { value: "Disqualified", label: "Disqualified" }]} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : "Save Changes"}</Button>
          </div>
        </form>
      </Modal>

      {/* Convert Modal */}
      <Modal open={showConvert} onClose={() => setShowConvert(false)} title="Convert Lead">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Converting this lead will create an <strong>Account</strong> and <strong>Contact</strong> record.
          </p>
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Account Name</span><span>{lead.company_name || `${lead.first_name} ${lead.last_name}`}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Contact</span><span>{lead.first_name} {lead.last_name}</span></div>
            {lead.email && <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{lead.email}</span></div>}
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={convertCreateOpp} onChange={(e) => setConvertCreateOpp(e.target.checked)}
              className="rounded border-border" />
            Also create an Opportunity
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowConvert(false)}>Cancel</Button>
            <Button onClick={() => convertMutation.mutate()} disabled={convertMutation.isPending}>
              {convertMutation.isPending ? "Converting..." : "Convert Lead"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
