import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { GosaiCompany } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Building2, Trash2, Globe } from "lucide-react";

const USER_ID = "47f2407b-67b9-4aa1-9a58-50bc0d461059";

export default function Companies() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", domain: "", industry: "", size: "", phone: "", email: "", address: "" });

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data } = await supabase.from("gosai_companies").select("*").order("created_at", { ascending: false });
      return (data ?? []) as GosaiCompany[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("gosai_companies").insert({
        user_id: USER_ID,
        name: form.name,
        domain: form.domain || null,
        industry: form.industry || null,
        size: form.size || null,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
      }).select().single();
      if (error) throw error;
      await supabase.from("gosai_activities").insert({
        user_id: USER_ID,
        type: "created",
        description: `Created company ${form.name}`,
        linked_type: "company",
        linked_id: data.id,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setShowModal(false);
      setForm({ name: "", domain: "", industry: "", size: "", phone: "", email: "", address: "" });
      toast.success("Company created");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gosai_companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company deleted");
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
          <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
          <p className="text-sm text-muted-foreground mt-1">{companies.length} compan{companies.length !== 1 ? "ies" : "y"}</p>
        </div>
        <Button onClick={() => setShowModal(true)}><Plus size={16} />Add Company</Button>
      </div>

      {companies.length === 0 ? (
        <EmptyState icon={<Building2 size={48} />} title="No companies yet" description="Create your first company to organize contacts and deals."
          action={<Button onClick={() => setShowModal(true)}><Plus size={16} />Add Company</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((company) => (
            <div key={company.id} className="group rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-all">
              <div className="flex items-start justify-between">
                <Link to={`/companies/${company.id}`} className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate hover:text-primary transition-colors">{company.name}</h3>
                  {company.industry && <p className="text-xs text-muted-foreground mt-1">{company.industry}</p>}
                  {company.domain && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Globe size={10} />{company.domain.replace(/^https?:\/\//, "")}
                    </p>
                  )}
                </Link>
                <button onClick={() => { if (confirm("Delete this company?")) deleteMutation.mutate(company.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition-all cursor-pointer"><Trash2 size={14} /></button>
              </div>
              {company.size && <p className="text-xs text-muted-foreground mt-3">{company.size} employees</p>}
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Company">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
          <Input label="Company Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Domain" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="example.com" />
          <Input label="Industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Technology, Finance, etc." />
          <Select label="Size" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })}
            options={[{ value: "", label: "Select size" }, { value: "1-10", label: "1-10" }, { value: "11-50", label: "11-50" }, { value: "51-200", label: "51-200" }, { value: "201-500", label: "201-500" }, { value: "500+", label: "500+" }]} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Company"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
