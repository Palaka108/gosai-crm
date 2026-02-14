import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { GosaiContact, GosaiDeal, GosaiActivity, GosaiTask } from "@/lib/types";
import { Card, CardTitle, CardValue } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Users, Handshake, DollarSign, TrendingUp, Activity, CheckSquare } from "lucide-react";

export default function Dashboard() {
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data } = await supabase.from("gosai_contacts").select("*").order("created_at", { ascending: false });
      return (data ?? []) as GosaiContact[];
    },
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const { data } = await supabase.from("gosai_deals").select("*").order("created_at", { ascending: false });
      return (data ?? []) as GosaiDeal[];
    },
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activities-recent"],
    queryFn: async () => {
      const { data } = await supabase.from("gosai_activities").select("*").order("created_at", { ascending: false }).limit(10);
      return (data ?? []) as GosaiActivity[];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks-upcoming"],
    queryFn: async () => {
      const { data } = await supabase
        .from("gosai_tasks")
        .select("*")
        .in("status", ["pending", "in_progress"])
        .order("due_date", { ascending: true })
        .limit(8);
      return (data ?? []) as GosaiTask[];
    },
  });

  const openDeals = deals.filter((d) => d.stage !== "Closed Won" && d.stage !== "Closed Lost");
  const totalPipelineValue = openDeals.reduce((sum, d) => sum + (d.value ?? 0), 0);
  const wonValue = deals.filter((d) => d.stage === "Closed Won").reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Pipeline overview and recent activity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Total Contacts</CardTitle>
              <CardValue className="mt-2">{contacts.length}</CardValue>
            </div>
            <div className="p-2 rounded-lg bg-primary/10"><Users size={18} className="text-primary" /></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Open Deals</CardTitle>
              <CardValue className="mt-2">{openDeals.length}</CardValue>
            </div>
            <div className="p-2 rounded-lg bg-warning/10"><Handshake size={18} className="text-warning" /></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Pipeline Value</CardTitle>
              <CardValue className="mt-2">${totalPipelineValue.toLocaleString()}</CardValue>
            </div>
            <div className="p-2 rounded-lg bg-accent/10"><DollarSign size={18} className="text-accent" /></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Won Revenue</CardTitle>
              <CardValue className="mt-2 text-success">${wonValue.toLocaleString()}</CardValue>
            </div>
            <div className="p-2 rounded-lg bg-success/10"><TrendingUp size={18} className="text-success" /></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <Activity size={16} className="text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Recent Activity</h3>
          </div>
          <div className="space-y-3">
            {activities.map((item) => (
              <div key={item.id} className="flex gap-3 py-1.5 border-b border-border/50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{item.description || item.type}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <Badge variant="default" className="self-start text-[10px]">{item.linked_type}</Badge>
              </div>
            ))}
            {activities.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-5">
            <CheckSquare size={16} className="text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Upcoming Tasks</h3>
          </div>
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 py-1.5 border-b border-border/50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{task.title}</p>
                  {task.due_date && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Due {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  )}
                </div>
                <Badge variant={task.priority === "high" || task.priority === "urgent" ? "destructive" : "default"} className="text-[10px]">
                  {task.priority}
                </Badge>
              </div>
            ))}
            {tasks.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No tasks yet</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
