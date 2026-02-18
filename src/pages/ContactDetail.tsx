import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { CrmContact, CrmAccount, CrmActivity, CrmOpportunity, ContactStatus } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { NotesSection } from "@/components/shared/NotesSection";
import { ArrowLeft, Mail, Phone, Building2, User, Pencil, Linkedin, Target, DollarSign } from "lucide-react";

const USER_ID = "47f2407b-67b9-4aa1-9a58-50bc0d461059";

const STATUS_BADGE: Record<ContactStatus, "info" | "warning" | "success" | "default" | "destructive"> = {
  lead: "info", prospect: "warning", client: "success", inactive: "default", churned: "destructive",
};

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    title: "",
    source: "",
    status: "lead" as ContactStatus,
    account_id: "",
    linkedin_url: "",
  });

  const { data: contact, isLoading } = useQuery({
    queryKey: ["contact", id],
    queryFn: async () => {
      const { data } = await supabase.from("crm_contacts").select("*, crm_accounts(id, name)").eq("id", id!).single();
      return data as CrmContact;
    },
    enabled: !!id,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["contact-activities", id],
    queryFn: async () => {
      const { data } = await supabase.from("crm_activities").select("*").eq("linked_type", "contact").eq("linked_id", id!).order("created_at", { ascending: false });
      return (data ?? []) as CrmActivity[];
    },
    enabled: !!id,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts-list"],
    queryFn: async () => {
      const { data } = await supabase.from("crm_accounts").select("id, name").order("name");
      return (data ?? []) as CrmAccount[];
    },
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ["contact-opportunities", id],
    queryFn: async () => {
      const { data } = await supabase.from("crm_opportunities").select("*").eq("contact_id", id!).order("created_at", { ascending: false });
      return (data ?? []) as CrmOpportunity[];
    },
    enabled: !!id,
  });

  const openEditModal = () => {
    if (!contact) return;
    setForm({
      first_name: contact.first_name,
      last_name: contact.last_name ?? "",
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      title: contact.title ?? "",
      source: contact.source ?? "",
      status: contact.status,
      account_id: contact.account_id ?? "",
      linkedin_url: contact.linkedin_url ?? "",
    });
    setShowEdit(true);
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const updates = {
        first_name: form.first_name,
        last_name: form.last_name || null,
        email: form.email || null,
        phone: form.phone || null,
        title: form.title || null,
        source: form.source || null,
        status: form.status,
        account_id: form.account_id || null,
        linkedin_url: form.linkedin_url || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("crm_contacts").update(updates).eq("id", id!);
      if (error) throw error;

      const changes: string[] = [];
      if (contact?.first_name !== form.first_name || contact?.last_name !== (form.last_name || null)) changes.push(`name to ${form.first_name} ${form.last_name}`);
      if (contact?.email !== (form.email || null)) changes.push(`email to ${form.email}`);
      if (contact?.status !== form.status) changes.push(`status from ${contact?.status} to ${form.status}`);

      if (changes.length > 0) {
        await supabase.from("crm_activities").insert({
          user_id: USER_ID,
          type: "updated",
          description: `Updated contact: ${changes.join(", ")}`,
          linked_type: "contact",
          linked_id: id!,
          metadata: { changes },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact", id] });
      queryClient.invalidateQueries({ queryKey: ["contact-activities", id] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setShowEdit(false);
      toast.success("Contact updated");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!contact) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="p-4 rounded-full bg-muted/30">
        <User size={40} className="text-muted-foreground/40" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-foreground">Contact not found</h2>
        <p className="text-sm text-muted-foreground mt-1">This contact may have been deleted or the link is invalid.</p>
      </div>
      <Link to="/contacts" className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors">
        <ArrowLeft size={16} />Back to Contacts
      </Link>
    </div>
  );

  return (
    <div className="space-y-6">
      <Link to="/contacts" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} />Back to Contacts
      </Link>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-xl font-medium text-primary">
            {contact.first_name.charAt(0)}{contact.last_name?.charAt(0) || ""}
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{contact.first_name} {contact.last_name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {contact.title && <span className="text-sm text-muted-foreground">{contact.title}</span>}
              <Badge variant={STATUS_BADGE[contact.status]}>{contact.status}</Badge>
            </div>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={openEditModal}>
          <Pencil size={14} />Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <NotesSection linkedType="contact" linkedId={id!} />

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
              {contact.email && <div className="flex items-center gap-2 text-sm"><Mail size={14} className="text-muted-foreground" />{contact.email}</div>}
              {contact.phone && <div className="flex items-center gap-2 text-sm"><Phone size={14} className="text-muted-foreground" />{contact.phone}</div>}
              {contact.crm_accounts && (
                <Link to={`/accounts/${contact.crm_accounts.id}`} className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                  <Building2 size={14} className="text-muted-foreground" />{contact.crm_accounts.name}
                </Link>
              )}
              {contact.linkedin_url && (
                <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Linkedin size={14} />LinkedIn
                </a>
              )}
              {contact.source && <div className="flex items-center gap-2 text-sm"><User size={14} className="text-muted-foreground" />Source: {contact.source}</div>}
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
              <Target size={14} className="inline mr-1" />Opportunities ({opportunities.length})
            </h3>
            <div className="space-y-2">
              {opportunities.map((o) => (
                <Link key={o.id} to={`/opportunities/${o.id}`} className="flex justify-between text-sm hover:text-primary transition-colors">
                  <span className="truncate">{o.name}</span>
                  <span className="text-muted-foreground flex items-center gap-0.5 shrink-0"><DollarSign size={10} />{(o.amount ?? 0).toLocaleString()}</span>
                </Link>
              ))}
              {opportunities.length === 0 && <p className="text-xs text-muted-foreground">No opportunities linked</p>}
            </div>
          </Card>
        </div>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Contact">
        <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            <Input label="Last Name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Job Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="LinkedIn URL" value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." />
          <Select label="Account" value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}
            options={[{ value: "", label: "No account" }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]} />
          <Select label="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
            options={[{ value: "", label: "Select source" }, { value: "referral", label: "Referral" }, { value: "website", label: "Website" }, { value: "cold", label: "Cold Outreach" }, { value: "event", label: "Event" }, { value: "linkedin", label: "LinkedIn" }]} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ContactStatus })}
            options={[{ value: "lead", label: "Lead" }, { value: "prospect", label: "Prospect" }, { value: "client", label: "Client" }, { value: "inactive", label: "Inactive" }, { value: "churned", label: "Churned" }]} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : "Save Changes"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
