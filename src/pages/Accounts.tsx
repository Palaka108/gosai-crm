import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { CrmAccount, AccountType, AccountStage } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Building2, Trash2, Globe } from "lucide-react";

const USER_ID = "47f2407b-67b9-4aa1-9a58-50bc0d461059";

const TYPE_BADGE: Record<AccountType, "info" | "success" | "warning" | "default"> = {
  Prospect: "info", Customer: "success", Partner: "warning", Other: "default",
};

export default function Accounts() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [form, setForm] = useState({
    name: "", website: "", industry: "", size: "", phone: "", email: "", address: "",
    type: "Prospect" as AccountType, stage: "Prospecting" as AccountStage, region: "",
  });

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["accounts", filterType],
    queryFn: async () => {
      let q = supabase.from("crm_accounts").select("*").order("created_at", { ascending: false });
      if (filterType !== "all") q = q.eq("type", filterType);
      const { data } = await q;
      return (data ?? []) as CrmAccount[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("crm_accounts").insert({
        user_id: USER_ID,
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
      }).select().single();
      if (error) throw error;
      await supabase.from("crm_activities").insert({
        user_id: USER_ID,
        type: "created",
        description: `Created account ${form.name}`,
        linked_type: "account",
        linked_id: data.id,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setShowModal(false);
      setForm({ name: "", website: "", industry: "", size: "", phone: "", email: "", address: "", type: "Prospect", stage: "Prospecting", region: "" });
      toast.success("Account created");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account deleted");
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
          <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">{accounts.length} account{accounts.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowModal(true)}><Plus size={16} />Add Account</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "Prospect", "Customer", "Partner", "Other"].map((s) => (
          <button key={s} onClick={() => setFilterType(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${filterType === s ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>

      {accounts.length === 0 ? (
        <EmptyState icon={<Building2 size={48} />} title="No accounts yet" description="Create your first account to organize contacts and opportunities."
          action={<Button onClick={() => setShowModal(true)}><Plus size={16} />Add Account</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <div key={account.id} className="group rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-all">
              <div className="flex items-start justify-between">
                <Link to={`/accounts/${account.id}`} className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate hover:text-primary transition-colors">{account.name}</h3>
                  {account.industry && <p className="text-xs text-muted-foreground mt-1">{account.industry}</p>}
                  {account.website && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Globe size={10} />{account.website.replace(/^https?:\/\//, "")}
                    </p>
                  )}
                </Link>
                <button onClick={() => { if (confirm("Delete this account?")) deleteMutation.mutate(account.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition-all cursor-pointer"><Trash2 size={14} /></button>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant={TYPE_BADGE[account.type]}>{account.type}</Badge>
                {account.size && <span className="text-xs text-muted-foreground">{account.size} employees</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Account">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
          <Input label="Account Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="example.com" />
          <Input label="Industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Technology, Finance, etc." />
          <Select label="Company Size" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })}
            options={[{ value: "", label: "Select size" }, { value: "1-10", label: "1-10" }, { value: "11-50", label: "11-50" }, { value: "51-200", label: "51-200" }, { value: "201-500", label: "201-500" }, { value: "500+", label: "500+" }]} />
          <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}
            options={[{ value: "Prospect", label: "Prospect" }, { value: "Customer", label: "Customer" }, { value: "Partner", label: "Partner" }, { value: "Other", label: "Other" }]} />
          <Select label="Stage" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as AccountStage })}
            options={[{ value: "Prospecting", label: "Prospecting" }, { value: "Active", label: "Active" }, { value: "Dormant", label: "Dormant" }]} />
          <Input label="Region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="e.g. US West, EMEA" />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Account"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
