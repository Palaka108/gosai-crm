import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { CrmActivity } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Activity } from "lucide-react";

const TYPE_BADGE: Record<string, "info" | "warning" | "success" | "default" | "destructive"> = {
  email: "info", call: "warning", meeting: "success", created: "default",
  updated: "default", stage_change: "info", converted: "success", note: "default",
};

const ENTITY_LINKS: Record<string, string> = {
  lead: "/leads", account: "/accounts", contact: "/contacts", opportunity: "/opportunities",
};

export default function Activities() {
  const [filterType, setFilterType] = useState<string>("all");

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["all-activities", filterType],
    queryFn: async () => {
      let q = supabase.from("crm_activities").select("*").order("created_at", { ascending: false }).limit(100);
      if (filterType !== "all") q = q.eq("type", filterType);
      const { data } = await q;
      return (data ?? []) as CrmActivity[];
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activities</h1>
        <p className="text-sm text-muted-foreground mt-1">All activity across your CRM</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "created", "updated", "stage_change", "converted", "email", "call", "meeting"].map((t) => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${filterType === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
            {t === "all" ? "All" : t.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      {activities.length === 0 ? (
        <EmptyState icon={<Activity size={48} />} title="No activities yet" description="Activities will appear here as you work with your CRM." />
      ) : (
        <div className="space-y-1">
          {activities.map((a) => (
            <div key={a.id} className="flex items-start gap-3 px-4 py-3 rounded-lg hover:bg-muted/20 transition-colors">
              <div className="w-1 h-1 rounded-full bg-primary/40 mt-2.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm">{a.description || a.type}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                  {a.linked_type && a.linked_id && (
                    <Link to={`${ENTITY_LINKS[a.linked_type] || ""}/${a.linked_id}`}
                      className="text-xs text-primary hover:underline">
                      View {a.linked_type}
                    </Link>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={TYPE_BADGE[a.type] || "default"} className="text-[10px]">{a.type.replace("_", " ")}</Badge>
                <Badge variant="default" className="text-[10px]">{a.linked_type}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
