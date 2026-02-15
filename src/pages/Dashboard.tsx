import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { CrmOpportunity, CrmActivity, CrmTask, CrmLead } from "@/lib/types";
import { Card, CardTitle, CardValue } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { UserPlus, Target, DollarSign, TrendingUp, Activity, CheckSquare, Sparkles } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

// Pesto Tech palette for charts
const CHART_COLORS = ["#2F6F5E", "#3A7D6A", "#2563EB", "#F59E0B", "#EF4444", "#8B5CF6"];
const STAGE_COLORS: Record<string, string> = {
  "Prospecting": "#2563EB",
  "Qualification": "#3A7D6A",
  "Proposal/Quote": "#F59E0B",
  "Negotiation/Review": "#8B5CF6",
  "Closed Won": "#22C55E",
  "Closed Lost": "#EF4444",
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-foreground font-medium">{p.name}: {typeof p.value === "number" && p.name?.includes("$") ? `$${p.value.toLocaleString()}` : p.value}</p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data } = await supabase.from("crm_leads").select("*").order("created_at", { ascending: false });
      return (data ?? []) as CrmLead[];
    },
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ["opportunities"],
    queryFn: async () => {
      const { data } = await supabase.from("crm_opportunities").select("*").order("created_at", { ascending: false });
      return (data ?? []) as CrmOpportunity[];
    },
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activities-recent"],
    queryFn: async () => {
      const { data } = await supabase.from("crm_activities").select("*").order("created_at", { ascending: false }).limit(10);
      return (data ?? []) as CrmActivity[];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks-upcoming"],
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_tasks")
        .select("*")
        .in("status", ["pending", "in_progress"])
        .order("due_date", { ascending: true })
        .limit(8);
      return (data ?? []) as CrmTask[];
    },
  });

  const openOpps = opportunities.filter((o) => o.stage !== "Closed Won" && o.stage !== "Closed Lost");
  const totalPipelineValue = openOpps.reduce((sum, o) => sum + (o.amount ?? 0), 0);
  const wonValue = opportunities.filter((o) => o.stage === "Closed Won").reduce((sum, o) => sum + (o.amount ?? 0), 0);

  // Pipeline by stage (bar chart)
  const pipelineByStage = useMemo(() => {
    const stages = ["Prospecting", "Qualification", "Proposal/Quote", "Negotiation/Review", "Closed Won", "Closed Lost"];
    return stages.map((stage) => {
      const opps = opportunities.filter((o) => o.stage === stage);
      return { stage, "$ Amount": opps.reduce((s, o) => s + (o.amount ?? 0), 0), count: opps.length };
    });
  }, [opportunities]);

  // Opportunities by stage (pie chart)
  const oppsByStage = useMemo(() => {
    const counts: Record<string, number> = {};
    opportunities.forEach((o) => { counts[o.stage] = (counts[o.stage] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [opportunities]);

  // Leads by source (bar chart)
  const leadsBySource = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => { const src = l.source || "Unknown"; counts[src] = (counts[src] || 0) + 1; });
    return Object.entries(counts).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);
  }, [leads]);

  // Leads by status (pie chart)
  const leadsByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => { counts[l.status] = (counts[l.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [leads]);

  const statCards = [
    { title: "Total Leads", value: leads.length, format: (v: number) => v.toString(), icon: UserPlus, color: "primary", delay: 0 },
    { title: "Open Opportunities", value: openOpps.length, format: (v: number) => v.toString(), icon: Target, color: "warning", delay: 1 },
    { title: "Pipeline Value", value: totalPipelineValue, format: (v: number) => `$${v.toLocaleString()}`, icon: DollarSign, color: "accent", delay: 2 },
    { title: "Won Revenue", value: wonValue, format: (v: number) => `$${v.toLocaleString()}`, icon: TrendingUp, color: "success", delay: 3 },
  ] as const;

  const hasOpps = opportunities.length > 0;
  const hasLeads = leads.length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-slide-down">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={20} className="text-primary animate-float" />
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <p className="text-sm text-muted-foreground">Pipeline overview and recent activity</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className={`metric-card rounded-xl p-5 group animate-slide-up delay-${stat.delay}`}>
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
              <div className={`mt-4 h-0.5 rounded-full bg-gradient-to-r from-${stat.color}/30 via-${stat.color}/10 to-transparent`} />
            </div>
          );
        })}
      </div>

      {/* Pipeline Charts */}
      {hasOpps && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="animate-slide-up delay-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Pipeline by Stage</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={pipelineByStage} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <XAxis dataKey="stage" tick={{ fill: "#9CA3AF", fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 10) + "..." : v} />
                <YAxis tick={{ fill: "#9CA3AF", fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(47,111,94,0.08)" }} />
                <Bar dataKey="$ Amount" radius={[6, 6, 0, 0]}>
                  {pipelineByStage.map((entry) => (
                    <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] || "#2F6F5E"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="animate-slide-up delay-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Opportunities by Stage</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={oppsByStage} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}
                  dataKey="value" nameKey="name" stroke="none">
                  {oppsByStage.map((entry, i) => (
                    <Cell key={entry.name} fill={STAGE_COLORS[entry.name] || CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(value: string) => <span className="text-xs text-muted-foreground">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Lead Charts */}
      {hasLeads && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="animate-slide-up delay-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Leads by Source</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={leadsBySource} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <XAxis type="number" tick={{ fill: "#9CA3AF", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="source" tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(47,111,94,0.08)" }} />
                <Bar dataKey="count" name="Leads" fill="#2F6F5E" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="animate-slide-up delay-7">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Leads by Status</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={leadsByStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}
                  dataKey="value" nameKey="name" stroke="none">
                  {leadsByStatus.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(value: string) => <span className="text-xs text-muted-foreground">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

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
