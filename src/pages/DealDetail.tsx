import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { GosaiDeal, GosaiActivity } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { NotesSection } from "@/components/shared/NotesSection";
import { ArrowLeft, DollarSign, Calendar, User } from "lucide-react";

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();

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

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!deal) return <div className="text-center py-16 text-muted-foreground">Deal not found</div>;

  return (
    <div className="space-y-6">
      <Link to="/deals" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} />Back to Deals
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">{deal.title}</h1>
        <div className="flex items-center gap-3 mt-2">
          <Badge variant="info">{deal.stage}</Badge>
          <span className="text-lg font-medium flex items-center gap-1"><DollarSign size={16} />{(deal.value ?? 0).toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">{deal.probability}% probability</span>
        </div>
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
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
