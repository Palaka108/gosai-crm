import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { CrmAccount, CrmContact, CrmOpportunity, AccountType, AccountStage } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { NotesSection } from "@/components/shared/NotesSection";
import { ArrowLeft, Globe, Phone, Mail, Pencil, DollarSign, MapPin } from "lucide-react";

const USER_ID = "47f2407b-67b9-4aa1-9a58-50bc0d461059";

const TYPE_BADGE: Record<AccountType, "info" | "success" | "warning" | "default"> = {
  Prospect: "info", Customer: "success", Partner: "warning", Other: "default",
};

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({
    name: "", website: "", industry: "", size: "", phone: "", email: "", address: "",
    type: "Prospect" as AccountType, stage: "Prospecting" as AccountStage, region: "",
  });

  const { data: account, isLoading } = useQuery({
    queryKey: ["account", id],
    queryFn: async () => {
      const { data } = await supabase.from("crm_accounts").select("*").eq("id", id!).single();
      return data as CrmAccount;
    },
    enabled: !!id,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["account-contacts", id],
    queryFn: async () => {
      const { data } = await supabase.from("crm_contacts").select("*").eq("account_id", id!).order("first_name");
      return (data ?? []) as CrmContact[];
    },
    enabled: !!id,
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ["account-opportunities", id],
    queryFn: async () => {
      const { data } = await supabase.from("crm_opportunities").select("*").eq("account_id", id!).order("created_at", { ascending: false });
      return (data ?? []) as CrmOpportunity[];
    },
    enabled: !!id,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["account-activities", id],
    queryFn: async () => {
      const { data } = await supabase.from("crm_activities").select("*").eq("linked_type", "account").eq("linked_id", id!).order("created_at", { ascending: false }).limit(10);
      return (data ?? []) as { id: string; type: string; description: string | null; created_at: string }[];
    },
    enabled: !!id,
  });

  const openEditModal = () => {
    if (!account) return;
    setForm({
      name: account.name,
      website: account.website ?? "",
      industry: account.industry ?? "",
      size: account.size ?? "",
      phone: account.phone ?? "",
      email: account.email ?? "",
      address: account.address ?? "",
      type: account.type,
      stage: account.stage,
      region: account.region ?? "",
    });
    setShowEdit(true);
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const updates = {
        name: form.name,
        website: form.website || null,
        industry: form.industry || null,
        size: form.size || null,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        type: form.type,
        stage: form.stage,
        region: form.region || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("crm_accounts").update(updates).eq("id", id!);
      if (error) throw error;

      const changes: string[] = [];
      if (account?.name !== form.name) changes.push(`name to "${form.name}"`);
      if (account?.type !== form.type) changes.push(`type to ${form.type}`);
      if (account?.stage !== form.stage) changes.push(`stage to ${form.stage}`);

      if (changes.length > 0) {
        await supabase.from("crm_activities").insert({
          user_id: USER_ID,
          type: "updated",
          description: `Updated account: ${changes.join(", ")}`,
          linked_type: "account",
          linked_id: id!,
          metadata: { changes },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", id] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["account-activities", id] });
      setShowEdit(false);
      toast.success("Account updated");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!account) return <div className="text-center py-16 text-muted-foreground">Account not found</div>;

  return (
    <div className="space-y-6">
      <Link to="/accounts" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} />Back to Accounts
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{account.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {account.industry && <span>{account.industry}</span>}
            <Badge variant={TYPE_BADGE[account.type]}>{account.type}</Badge>
            <Badge variant="default">{account.stage}</Badge>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={openEditModal}>
          <Pencil size={14} />Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <NotesSection linkedType="account" linkedId={id!} />

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
              {account.website && <div className="flex items-center gap-2 text-sm"><Globe size={14} className="text-muted-foreground" />{account.website}</div>}
              {account.phone && <div className="flex items-center gap-2 text-sm"><Phone size={14} className="text-muted-foreground" />{account.phone}</div>}
              {account.email && <div className="flex items-center gap-2 text-sm"><Mail size={14} className="text-muted-foreground" />{account.email}</div>}
              {account.region && <div className="flex items-center gap-2 text-sm"><MapPin size={14} className="text-muted-foreground" />{account.region}</div>}
              {account.size && <div className="text-sm text-muted-foreground">{account.size} employees</div>}
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Contacts ({contacts.length})</h3>
            <div className="space-y-2">
              {contacts.map((c) => (
                <Link key={c.id} to={`/contacts/${c.id}`} className="block text-sm hover:text-primary transition-colors">
                  {c.first_name} {c.last_name}
                  {c.title && <span className="text-xs text-muted-foreground ml-2">{c.title}</span>}
                </Link>
              ))}
              {contacts.length === 0 && <p className="text-xs text-muted-foreground">No contacts linked</p>}
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Opportunities ({opportunities.length})</h3>
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

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Account">
        <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-4">
          <Input label="Account Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="example.com" />
          <Input label="Industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
          <Select label="Size" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })}
            options={[{ value: "", label: "Select size" }, { value: "1-10", label: "1-10" }, { value: "11-50", label: "11-50" }, { value: "51-200", label: "51-200" }, { value: "201-500", label: "201-500" }, { value: "500+", label: "500+" }]} />
          <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}
            options={[{ value: "Prospect", label: "Prospect" }, { value: "Customer", label: "Customer" }, { value: "Partner", label: "Partner" }, { value: "Other", label: "Other" }]} />
          <Select label="Stage" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as AccountStage })}
            options={[{ value: "Prospecting", label: "Prospecting" }, { value: "Active", label: "Active" }, { value: "Dormant", label: "Dormant" }]} />
          <Input label="Region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : "Save Changes"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
