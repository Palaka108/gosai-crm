import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { GosaiCompany, GosaiContact, GosaiDeal } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { NotesSection } from "@/components/shared/NotesSection";
import { ArrowLeft, Globe, Phone, Mail, Pencil } from "lucide-react";

const USER_ID = "47f2407b-67b9-4aa1-9a58-50bc0d461059";

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({
    name: "",
    domain: "",
    industry: "",
    size: "",
    phone: "",
    email: "",
    address: "",
  });

  const { data: company, isLoading } = useQuery({
    queryKey: ["company", id],
    queryFn: async () => {
      const { data } = await supabase.from("gosai_companies").select("*").eq("id", id!).single();
      return data as GosaiCompany;
    },
    enabled: !!id,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["company-contacts", id],
    queryFn: async () => {
      const { data } = await supabase.from("gosai_contacts").select("*").eq("company_id", id!).order("first_name");
      return (data ?? []) as GosaiContact[];
    },
    enabled: !!id,
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["company-deals", id],
    queryFn: async () => {
      const { data } = await supabase.from("gosai_deals").select("*").eq("company_id", id!).order("created_at", { ascending: false });
      return (data ?? []) as GosaiDeal[];
    },
    enabled: !!id,
  });

  const openEditModal = () => {
    if (!company) return;
    setForm({
      name: company.name,
      domain: company.domain ?? "",
      industry: company.industry ?? "",
      size: company.size ?? "",
      phone: company.phone ?? "",
      email: company.email ?? "",
      address: company.address ?? "",
    });
    setShowEdit(true);
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const updates = {
        name: form.name,
        domain: form.domain || null,
        industry: form.industry || null,
        size: form.size || null,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("gosai_companies").update(updates).eq("id", id!);
      if (error) throw error;

      const changes: string[] = [];
      if (company?.name !== form.name) changes.push(`name to "${form.name}"`);
      if (company?.industry !== (form.industry || null)) changes.push(`industry to ${form.industry}`);
      if (company?.domain !== (form.domain || null)) changes.push(`domain to ${form.domain}`);

      if (changes.length > 0) {
        await supabase.from("gosai_activities").insert({
          user_id: USER_ID,
          type: "updated",
          description: `Updated company: ${changes.join(", ")}`,
          linked_type: "company",
          linked_id: id!,
          metadata: { changes },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", id] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setShowEdit(false);
      toast.success("Company updated");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!company) return <div className="text-center py-16 text-muted-foreground">Company not found</div>;

  return (
    <div className="space-y-6">
      <Link to="/companies" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} />Back to Companies
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{company.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {company.industry && <span>{company.industry}</span>}
            {company.size && <Badge variant="default">{company.size} employees</Badge>}
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={openEditModal}>
          <Pencil size={14} />Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <NotesSection linkedType="company" linkedId={id!} />
        </div>

        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Details</h3>
            <div className="space-y-3">
              {company.domain && <div className="flex items-center gap-2 text-sm"><Globe size={14} className="text-muted-foreground" />{company.domain}</div>}
              {company.phone && <div className="flex items-center gap-2 text-sm"><Phone size={14} className="text-muted-foreground" />{company.phone}</div>}
              {company.email && <div className="flex items-center gap-2 text-sm"><Mail size={14} className="text-muted-foreground" />{company.email}</div>}
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Contacts ({contacts.length})</h3>
            <div className="space-y-2">
              {contacts.map((c) => (
                <Link key={c.id} to={`/contacts/${c.id}`} className="block text-sm hover:text-primary transition-colors">
                  {c.first_name} {c.last_name}
                </Link>
              ))}
              {contacts.length === 0 && <p className="text-xs text-muted-foreground">No contacts linked</p>}
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Deals ({deals.length})</h3>
            <div className="space-y-2">
              {deals.map((d) => (
                <Link key={d.id} to={`/deals/${d.id}`} className="flex justify-between text-sm hover:text-primary transition-colors">
                  <span>{d.title}</span>
                  <span className="text-muted-foreground">${(d.value ?? 0).toLocaleString()}</span>
                </Link>
              ))}
              {deals.length === 0 && <p className="text-xs text-muted-foreground">No deals linked</p>}
            </div>
          </Card>
        </div>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Company">
        <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-4">
          <Input label="Company Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Domain" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="example.com" />
          <Input label="Industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Technology, Finance, etc." />
          <Select label="Size" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })}
            options={[{ value: "", label: "Select size" }, { value: "1-10", label: "1-10" }, { value: "11-50", label: "11-50" }, { value: "51-200", label: "51-200" }, { value: "201-500", label: "201-500" }, { value: "500+", label: "500+" }]} />
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
