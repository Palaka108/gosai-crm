import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Mail, Send, X, Check, Clock, Eye, RefreshCw, Building2 } from "lucide-react";

interface EmailDraft {
  id: string;
  lead_id: string;
  subject: string;
  body: string;
  tone: "personalized" | "standard" | "follow_up";
  status: "draft" | "approved" | "sent" | "rejected" | "bounced";
  approved_at: string | null;
  sent_at: string | null;
  sent_via: string | null;
  rejected_reason: string | null;
  client_tag: string | null;
  created_at: string;
  updated_at: string;
}

interface ApolloLead {
  id: string;
  full_name: string;
  email: string;
  title: string;
  company_name: string;
  score_tier: string;
  total_score: number;
  pipeline_stage: string;
  client_tag: string | null;
}

interface PosClient {
  id: string;
  client_tag: string;
  display_name: string;
  use_case: string;
  email_provider: string;
  weekly_send_limit: number;
  daily_send_limit: number | null;
  warmup_enabled: boolean;
  warmup_graduated: boolean;
  webhook_path: string;
  is_active: boolean;
}

interface DraftWithLead extends EmailDraft {
  lead?: ApolloLead;
}

const STATUS_BADGE: Record<string, "info" | "warning" | "success" | "default" | "destructive"> = {
  draft: "warning",
  approved: "info",
  sent: "success",
  rejected: "destructive",
  bounced: "destructive",
};

const TIER_BADGE: Record<string, "success" | "warning" | "default"> = {
  Hot: "success",
  Warm: "warning",
  Cold: "default",
};

const TONE_LABEL: Record<string, string> = {
  personalized: "Personalized",
  standard: "Standard",
  follow_up: "Follow-Up",
};

const N8N_BASE = "https://palaka.app.n8n.cloud";

export default function OutreachQueue() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("draft");
  const [activeClient, setActiveClient] = useState<string>("all");
  const [previewDraft, setPreviewDraft] = useState<DraftWithLead | null>(null);
  const [sendVia, setSendVia] = useState<"gmail" | "zoho">("gmail");

  // Fetch client configs
  const { data: clients = [] } = useQuery({
    queryKey: ["pos-clients"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pos_clients")
        .select("*")
        .eq("is_active", true)
        .order("display_name");
      return (data ?? []) as PosClient[];
    },
  });

  // Get active client config (for rate limit display + webhook routing)
  const activeClientConfig = clients.find((c) => c.client_tag === activeClient);

  // Fetch drafts with lead info — filtered by client
  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ["outreach-drafts", filterStatus, activeClient],
    queryFn: async () => {
      let q = supabase
        .from("pos_email_drafts")
        .select("*")
        .order("created_at", { ascending: false });
      if (filterStatus !== "all") q = q.eq("status", filterStatus);
      if (activeClient !== "all") q = q.eq("client_tag", activeClient);
      const { data: draftData } = await q;
      if (!draftData?.length) return [] as DraftWithLead[];

      // Fetch associated leads
      const leadIds = [...new Set(draftData.map((d: EmailDraft) => d.lead_id))];
      const { data: leadData } = await supabase
        .from("apollo_leads")
        .select("id, full_name, email, title, company_name, score_tier, total_score, pipeline_stage, client_tag")
        .in("id", leadIds);

      const leadMap = new Map((leadData ?? []).map((l: ApolloLead) => [l.id, l]));
      return draftData.map((d: EmailDraft) => ({
        ...d,
        lead: leadMap.get(d.lead_id),
      })) as DraftWithLead[];
    },
  });

  // Per-client weekly send count
  const { data: weeklySendCount = 0 } = useQuery({
    queryKey: ["weekly-send-count", activeClient],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      let q = supabase
        .from("pos_outreach_log")
        .select("*", { count: "exact", head: true })
        .eq("channel", "email")
        .gte("sent_at", weekAgo.toISOString());
      if (activeClient !== "all") q = q.eq("client_tag", activeClient);
      const { count } = await q;
      return count ?? 0;
    },
  });

  // Resolve the webhook URL for a draft based on its client_tag
  const getWebhookUrl = (clientTag: string | null): string => {
    const client = clients.find((c) => c.client_tag === clientTag);
    if (client?.webhook_path) return `${N8N_BASE}${client.webhook_path}`;
    // Fallback to generic webhook
    return `${N8N_BASE}/webhook/pos-approve-send`;
  };

  // Get weekly limit for display
  const weeklyLimit = activeClientConfig?.weekly_send_limit ?? 200;

  // Approve & Send via client-specific n8n webhook
  const sendMutation = useMutation({
    mutationFn: async ({ draftId, via, clientTag }: { draftId: string; via: string; clientTag: string | null }) => {
      const webhookUrl = getWebhookUrl(clientTag);
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft_id: draftId, send_via: via }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Send failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outreach-drafts"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-send-count"] });
      setPreviewDraft(null);
      toast.success("Email sent successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  // Reject draft
  const rejectMutation = useMutation({
    mutationFn: async (draftId: string) => {
      const { error } = await supabase
        .from("pos_email_drafts")
        .update({ status: "rejected", rejected_reason: "Manually rejected" })
        .eq("id", draftId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outreach-drafts"] });
      setPreviewDraft(null);
      toast.success("Draft rejected");
    },
    onError: (e) => toast.error(e.message),
  });

  const statusFilters = ["draft", "approved", "sent", "rejected", "all"];

  const draftCount = drafts.filter((d) => d.status === "draft").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Outreach Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve AI-generated outreach emails before sending
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              Weekly sends{activeClient !== "all" ? ` (${activeClientConfig?.display_name})` : ""}
            </p>
            <p className={`text-lg font-semibold ${weeklySendCount >= weeklyLimit * 0.9 ? "text-destructive" : "text-foreground"}`}>
              {weeklySendCount} / {weeklyLimit}
            </p>
          </div>
          <Badge variant={draftCount > 0 ? "warning" : "default"}>
            {draftCount} pending
          </Badge>
        </div>
      </div>

      {/* Client Filter */}
      {clients.length > 0 && (
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-muted-foreground" />
          <div className="flex gap-1">
            <button
              onClick={() => setActiveClient("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeClient === "all"
                  ? "bg-primary/10 text-primary border border-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface/60"
              }`}
            >
              All Clients
            </button>
            {clients.map((c) => (
              <button
                key={c.client_tag}
                onClick={() => setActiveClient(c.client_tag)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeClient === c.client_tag
                    ? "bg-primary/10 text-primary border border-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface/60"
                }`}
              >
                {c.display_name}
                {c.warmup_enabled && !c.warmup_graduated && (
                  <span className="ml-1 text-[10px] text-amber-400">(warming)</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status Filters */}
      <div className="flex gap-1">
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
              filterStatus === s
                ? "bg-primary/10 text-primary border border-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-surface/60"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Drafts Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : drafts.length === 0 ? (
        <EmptyState
          icon={<Mail size={40} />}
          title="No drafts yet"
          description="Run the 'POS: Generate Outreach Drafts' workflow in n8n to create email drafts for your scored leads."
        />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Lead</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Subject</th>
                {activeClient === "all" && (
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Client</th>
                )}
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Tier</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Tone</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Created</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((draft) => (
                <tr key={draft.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{draft.lead?.full_name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{draft.lead?.company_name ?? ""}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm truncate max-w-[250px]">{draft.subject}</p>
                  </td>
                  {activeClient === "all" && (
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground">
                        {clients.find((c) => c.client_tag === draft.client_tag)?.display_name ?? draft.client_tag ?? "—"}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {draft.lead?.score_tier && (
                      <Badge variant={TIER_BADGE[draft.lead.score_tier] ?? "default"}>
                        {draft.lead.score_tier}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">{TONE_LABEL[draft.tone] ?? draft.tone}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[draft.status] ?? "default"}>
                      {draft.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(draft.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setPreviewDraft(draft)}
                        className="p-1.5 rounded-md hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
                        title="Preview"
                      >
                        <Eye size={15} />
                      </button>
                      {draft.status === "draft" && (
                        <>
                          <button
                            onClick={() => {
                              setPreviewDraft(draft);
                            }}
                            className="p-1.5 rounded-md hover:bg-green-500/10 text-green-400 transition-colors"
                            title="Approve & Send"
                          >
                            <Send size={15} />
                          </button>
                          <button
                            onClick={() => rejectMutation.mutate(draft.id)}
                            className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                            title="Reject"
                          >
                            <X size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview & Approve Modal */}
      <Modal open={!!previewDraft} onClose={() => setPreviewDraft(null)} title="Email Preview">
        {previewDraft && (
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <Badge variant={STATUS_BADGE[previewDraft.status] ?? "default"}>
                {previewDraft.status}
              </Badge>
            </div>

            {/* Lead Info */}
            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{previewDraft.lead?.full_name}</p>
                {previewDraft.lead?.score_tier && (
                  <Badge variant={TIER_BADGE[previewDraft.lead.score_tier] ?? "default"}>
                    {previewDraft.lead.score_tier} ({previewDraft.lead.total_score})
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {previewDraft.lead?.title} at {previewDraft.lead?.company_name}
              </p>
              <p className="text-xs text-muted-foreground">{previewDraft.lead?.email}</p>
            </div>

            {/* Email Content */}
            <div className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Subject</p>
                <p className="text-sm font-medium bg-muted/20 rounded-md px-3 py-2">{previewDraft.subject}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Body</p>
                <div className="text-sm bg-muted/20 rounded-md px-3 py-2 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                  {previewDraft.body}
                </div>
              </div>
            </div>

            {/* Send Options (only for drafts) */}
            {previewDraft.status === "draft" && (
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <p className="text-xs text-muted-foreground">Send via:</p>
                  <div className="flex gap-1">
                    {(["gmail", "zoho"] as const).map((provider) => (
                      <button
                        key={provider}
                        onClick={() => setSendVia(provider)}
                        className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                          sendVia === provider
                            ? "bg-primary/10 text-primary border border-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        }`}
                      >
                        {provider}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => sendMutation.mutate({ draftId: previewDraft.id, via: sendVia, clientTag: previewDraft.client_tag })}
                    disabled={sendMutation.isPending || weeklySendCount >= weeklyLimit}
                    className="flex-1"
                  >
                    {sendMutation.isPending ? (
                      <RefreshCw size={14} className="animate-spin mr-2" />
                    ) : (
                      <Send size={14} className="mr-2" />
                    )}
                    {weeklySendCount >= weeklyLimit ? "Weekly Limit Reached" : `Approve & Send via ${sendVia}`}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => rejectMutation.mutate(previewDraft.id)}
                    disabled={rejectMutation.isPending}
                  >
                    <X size={14} className="mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            )}

            {/* Sent info */}
            {previewDraft.status === "sent" && previewDraft.sent_at && (
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">
                  <Check size={12} className="inline mr-1" />
                  Sent via {previewDraft.sent_via} on {new Date(previewDraft.sent_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
