import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { GosaiCompany, GosaiContact, GosaiDeal } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { NotesSection } from "@/components/shared/NotesSection";
import { ArrowLeft, Globe, Phone, Mail } from "lucide-react";

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();

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

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!company) return <div className="text-center py-16 text-muted-foreground">Company not found</div>;

  return (
    <div className="space-y-6">
      <Link to="/companies" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} />Back to Companies
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">{company.name}</h1>
        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
          {company.industry && <span>{company.industry}</span>}
          {company.size && <Badge variant="default">{company.size} employees</Badge>}
        </div>
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
    </div>
  );
}
