import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { GosaiContact, GosaiDeal, GosaiActivity, GosaiTask } from "@/lib/types";
import { Card, CardTitle, CardValue } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Users, Handshake, DollarSign, TrendingUp, Activity, CheckSquare, Sparkles } from "lucide-react";

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

  const statCards = [
    { title: "Total Contacts", value: contacts.length, format: (v: number) => v.toString(), icon: Users, color: "primary", delay: 0 },
    { title: "Open Deals", value: openDeals.length, format: (v: number) => v.toString(), icon: Handshake, color: "warning", delay: 1 },
    { title: "Pipeline Value", value: totalPipelineValue, format: (v: number) => `$${v.toLocaleString()}`, icon: DollarSign, color: "accent", delay: 2 },
    { title: "Won Revenue", value: wonValue, format: (v: number) => `$${v.toLocaleString()}`, icon: TrendingUp, color: "success", delay: 3 },
  ] as const;

  return (
    <div className="space-y-8">
      {/* Header with greeting */}
      <div className="animate-slide-down">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={20} className="text-primary animate-float" />
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <p className="text-sm text-muted-foreground">Pipeline overview and recent activity</p>
      </div>

      {/* Stat cards with staggered entrance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className={`metric-card rounded-xl p-5 group animate-slide-up delay-${stat.delay}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{stat.title}</CardTitle>
                  <CardValue className={`mt-2 ${stat.color === "success" ? "text-success" : ""}`}>
                    {stat.format(stat.value)}
                  </CardValue>
                </div>
                <div className={`p-2.5 rounded-xl bg-${stat.color}/10 border border-${stat.color}/10 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-${stat.color}/20`}>
                  <Icon size={20} className={`text-${stat.color}`} />
                </div>
              </div>
              {/* Subtle gradient accent line */}
              <div className={`mt-4 h-0.5 rounded-full bg-gradient-to-r from-${stat.color}/30 via-${stat.color}/10 to-transparent`} />
            </div>
          );
        })}
      </div>

      {/* Activity + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-slide-up delay-4 soft-glow-border">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Activity size={14} className="text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Activity</h3>
          </div>
          <div className="space-y-1">
            {activities.map((item, i) => (
              <div key={item.id} className={`flex gap-3 py-2.5 px-2 rounded-lg hover:bg-surface/40 transition-all duration-200 animate-slide-in-right delay-${Math.min(i, 10)}`}>
                <div className="w-1 h-1 rounded-full bg-primary/40 mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{item.description || item.type}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <Badge variant="default" className="self-start text-[10px]">{item.linked_type}</Badge>
              </div>
            ))}
            {activities.length === 0 && (
              <div className="text-center py-8">
                <Activity size={32} className="text-muted-foreground/20 mx-auto mb-2 animate-float" />
                <p className="text-sm text-muted-foreground">No activity yet</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="animate-slide-up delay-5 soft-glow-border">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-1.5 rounded-lg bg-accent/10">
              <CheckSquare size={14} className="text-accent" />
            </div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Upcoming Tasks</h3>
          </div>
          <div className="space-y-1">
            {tasks.map((task, i) => (
              <div key={task.id} className={`flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-surface/40 transition-all duration-200 animate-slide-in-right delay-${Math.min(i, 10)}`}>
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  task.priority === "urgent" ? "bg-destructive shadow-sm shadow-destructive/50" :
                  task.priority === "high" ? "bg-warning shadow-sm shadow-warning/50" :
                  "bg-muted-foreground/30"
                }`} />
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
            {tasks.length === 0 && (
              <div className="text-center py-8">
                <CheckSquare size={32} className="text-muted-foreground/20 mx-auto mb-2 animate-float" />
                <p className="text-sm text-muted-foreground">No tasks yet</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
